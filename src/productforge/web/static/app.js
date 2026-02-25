/**
 * ProductForge — Ebook PDF Designer.
 * Upload your content → confirm details → pick a design → download PDF.
 */

const PRESETS = window.__PRESETS__ || [];
const messagesEl = document.getElementById("chat-messages");
const inputZone = document.getElementById("input-zone");

const ebook = {
    title: "",
    subtitle: "",
    author: "",
    brand: "",
    design: null,
    logoPath: "",
    logoFilename: "",
    chapters: [],
};

let step = "greeting";

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => startChat(), 300);
});

// =========================================================================
// CHAT HELPERS
// =========================================================================

function addBotMsg(html, delay) {
    return new Promise(resolve => {
        const d = delay || 0;
        if (d > 0) showTyping();
        setTimeout(() => {
            hideTyping();
            const div = document.createElement("div");
            div.className = "msg bot";
            div.innerHTML = html;
            messagesEl.appendChild(div);
            scrollBottom();
            resolve(div);
        }, d);
    });
}

function addUserMsg(text) {
    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollBottom();
}

function showTyping() {
    let el = document.getElementById("typing-indicator");
    if (!el) {
        el = document.createElement("div");
        el.id = "typing-indicator";
        el.className = "typing";
        el.innerHTML = "<span></span><span></span><span></span>";
        messagesEl.appendChild(el);
    }
    scrollBottom();
}

function hideTyping() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
}

function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearInput() {
    inputZone.innerHTML = "";
}

// =========================================================================
// INPUT RENDERERS
// =========================================================================

function showTextInput(placeholder, onSubmit, opts) {
    clearInput();
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    if (opts?.value) input.value = opts.value;
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && input.value.trim()) onSubmit(input.value.trim());
    });
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = opts?.btnLabel || "Send";
    btn.addEventListener("click", () => {
        if (input.value.trim()) onSubmit(input.value.trim());
    });
    inputZone.appendChild(input);
    inputZone.appendChild(btn);

    if (opts?.skipLabel) {
        const skip = document.createElement("button");
        skip.className = "btn btn-secondary btn-small";
        skip.textContent = opts.skipLabel;
        skip.style.marginLeft = "4px";
        skip.addEventListener("click", () => onSubmit(""));
        inputZone.appendChild(skip);
    }

    input.focus();
}

function showTextArea(placeholder, onSubmit, btnLabel) {
    clearInput();
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:8px;width:100%";
    const ta = document.createElement("textarea");
    ta.placeholder = placeholder;
    ta.rows = 6;
    ta.addEventListener("input", () => {
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 300) + "px";
    });
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = btnLabel || "Send";
    btn.style.alignSelf = "flex-end";
    btn.addEventListener("click", () => {
        if (ta.value.trim()) onSubmit(ta.value.trim());
    });
    wrap.appendChild(ta);
    wrap.appendChild(btn);
    inputZone.appendChild(wrap);
    ta.focus();
}

function showButtons(buttons) {
    clearInput();
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;width:100%";
    buttons.forEach(({ label, cls, onClick }) => {
        const btn = document.createElement("button");
        btn.className = `btn ${cls || "btn-primary"}`;
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        wrap.appendChild(btn);
    });
    inputZone.appendChild(wrap);
}

// =========================================================================
// CHAPTER PARSER
// =========================================================================

function parseChaptersFromText(text) {
    const chapters = [];
    const lines = text.split("\n");
    let currentTitle = "";
    let currentContent = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const chapterMatch = trimmed.match(/^(?:chapter\s+\d+\s*[:.\-—]\s*|#{1,3}\s+)(.+)/i);
        const allCapsMatch = trimmed.match(/^[A-Z][A-Z\s:—\-]{10,}$/) && trimmed.split(/\s+/).length >= 3;
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);

        if (chapterMatch || allCapsMatch || numberedMatch) {
            if (currentTitle || currentContent.length > 0) {
                chapters.push({
                    title: currentTitle || `Chapter ${chapters.length + 1}`,
                    content: currentContent.join("\n").trim(),
                });
            }
            if (chapterMatch) currentTitle = chapterMatch[1].trim();
            else if (numberedMatch) currentTitle = numberedMatch[2].trim();
            else currentTitle = trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentTitle || currentContent.length > 0) {
        chapters.push({
            title: currentTitle || `Chapter ${chapters.length + 1}`,
            content: currentContent.join("\n").trim(),
        });
    }

    if (chapters.length === 0) {
        chapters.push({ title: "Chapter 1", content: text.trim() });
    }

    return chapters;
}

// =========================================================================
// FLOW: Step 1 — Upload content
// =========================================================================

async function startChat() {
    await addBotMsg("Welcome to <strong>ProductForge</strong> — I turn your content into a professionally designed ebook PDF.", 400);
    await addBotMsg("Upload your content and I'll handle the rest. Supports <strong>PDF, Word (.docx), text, and markdown</strong> files.", 600);
    await askUpload();
}

async function askUpload() {
    step = "upload";

    let html = '<div class="upload-zone" id="upload-zone">';
    html += '<div class="file-upload-area" style="flex-direction:column;gap:12px">';
    html += '<label style="padding:20px 30px;text-align:center"><span style="font-size:1rem">Choose a file to upload</span><br>';
    html += '<span style="font-size:0.75rem;color:var(--muted);margin-top:4px;display:block">PDF, DOCX, TXT, or MD</span>';
    html += '<input type="file" id="content-upload" accept=".pdf,.docx,.doc,.txt,.md,.text,.markdown" onchange="window.handleFileUpload(this)">';
    html += '</label>';
    html += '<span class="file-name" id="upload-status"></span>';
    html += '</div>';
    html += '</div>';

    await addBotMsg(html, 0);

    showButtons([
        { label: "Or paste text instead", cls: "btn-secondary btn-small", onClick: askPasteInstead },
    ]);
}

window.handleFileUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;

    const statusEl = document.getElementById("upload-status");
    const fname = file.name.toLowerCase();

    // Text files: read client-side
    if (fname.endsWith(".txt") || fname.endsWith(".md") || fname.endsWith(".text") || fname.endsWith(".markdown")) {
        statusEl.textContent = `Reading ${file.name}...`;
        const text = await file.text();
        await processContent(text, file.name);
        return;
    }

    // PDF/DOCX: send to server for extraction
    statusEl.textContent = `Extracting text from ${file.name}...`;
    clearInput();

    const formData = new FormData();
    formData.append("file", file);

    try {
        const resp = await fetch("/api/extract", { method: "POST", body: formData });
        const data = await resp.json();

        if (!resp.ok) {
            statusEl.textContent = data.error || "Extraction failed";
            return;
        }

        await processContent(data.text, file.name);
    } catch (e) {
        statusEl.textContent = "Upload failed — try again or paste text instead";
    }
};

async function askPasteInstead() {
    clearInput();
    await addBotMsg("Paste your ebook content below. Use headings like <em># Title</em> or <em>Chapter 1: Title</em> and I'll auto-detect chapters.", 400);
    showTextArea(
        "Paste your full ebook content here...",
        (text) => processContent(text, "pasted"),
        "Process content"
    );
}

// =========================================================================
// FLOW: Step 2 — Process content → detect title/subtitle → confirm
// =========================================================================

async function processContent(text, source) {
    clearInput();
    addUserMsg(source === "pasted" ? `[Pasted ${text.length} characters]` : `Uploaded: ${source}`);

    const chapters = parseChaptersFromText(text);

    // Auto-detect title and subtitle from leading short/empty chapters
    let guessTitle = "";
    let guessSubtitle = "";
    while (chapters.length > 1) {
        const first = chapters[0];
        const words = first.content.split(/\s+/).filter(Boolean).length;
        if (words <= 5) {
            if (!guessTitle) guessTitle = first.title;
            else if (!guessSubtitle) guessSubtitle = first.title;
            else break;
            chapters.shift();
        } else {
            break;
        }
    }
    if (!guessTitle && chapters.length > 0) {
        guessTitle = chapters[0].title;
    }

    ebook.chapters = chapters;
    ebook.title = guessTitle;
    ebook.subtitle = guessSubtitle;

    const totalWords = chapters.reduce((s, ch) => s + ch.content.split(/\s+/).filter(Boolean).length, 0);

    await addBotMsg(
        `Got it — <strong>${totalWords.toLocaleString()} words</strong> across ${chapters.length} section${chapters.length !== 1 ? "s" : ""}. Let's set up your ebook.`,
        400,
    );

    await askTitle();
}

// =========================================================================
// FLOW: Step 3 — Title, Subtitle, Author
// =========================================================================

async function askTitle() {
    step = "title";
    clearInput();
    await addBotMsg(`<strong>Confirm your ebook title:</strong>`, 400);
    showTextInput("Ebook title", handleTitle, { value: ebook.title, btnLabel: "Confirm" });
}

async function handleTitle(text) {
    addUserMsg(text);
    clearInput();
    ebook.title = text;
    await askSubtitle();
}

async function askSubtitle() {
    step = "subtitle";
    const prompt = ebook.subtitle
        ? `<strong>Confirm subtitle:</strong>`
        : `<strong>Add a subtitle?</strong> (optional)`;
    await addBotMsg(prompt, 300);
    showTextInput("e.g. A Complete Guide to...", handleSubtitle, {
        value: ebook.subtitle,
        btnLabel: ebook.subtitle ? "Confirm" : "Add",
        skipLabel: "Skip",
    });
}

async function handleSubtitle(text) {
    if (text) {
        addUserMsg(text);
        ebook.subtitle = text;
    }
    clearInput();
    await askAuthor();
}

async function askAuthor() {
    step = "author";
    await addBotMsg("<strong>Author name</strong> for the cover?", 300);
    showTextInput("Your name or pen name", handleAuthor, { btnLabel: "Confirm" });
}

async function handleAuthor(text) {
    addUserMsg(text);
    clearInput();
    ebook.author = text;
    await askQuickWins();
}

// =========================================================================
// FLOW: Step 4 — Quick wins (design style + brand)
// =========================================================================

async function askQuickWins() {
    step = "style";

    const swatches = {
        "Bold": { colors: ["#1E40AF", "#FACC15", "#ffffff", "#1E293B"], vibe: "Cobalt & electric yellow — grabs attention" },
        "Brutalist": { colors: ["#F5F0E0", "#000000", "#F6C90E", "#6B7280"], vibe: "Raw, bold, thick borders — no-nonsense" },
        "Clean": { colors: ["#1a2744", "#e17055", "#ffffff", "#f5f6fa"], vibe: "Navy & orange — professional, business-ready" },
        "Editorial": { colors: ["#F7F4EF", "#111110", "#8A9E8C", "#A09890"], vibe: "Parchment & sage — elegant, literary" },
        "Warm": { colors: ["#1a1a2e", "#F4C430", "#B4A7D6", "#e8e8e8"], vibe: "Dark & amber — premium, moody" },
    };

    await addBotMsg("<strong>Pick a design style</strong> for your ebook:", 400);

    let html = '<div class="style-cards">';
    PRESETS.forEach((p, i) => {
        const info = swatches[p.name] || { colors: ["#333"], vibe: "" };
        html += `<div class="style-card" data-index="${i}" onclick="window.selectStyle(${i})">
            <div class="style-name">${p.name}</div>
            <div class="style-desc">${info.vibe}</div>
            <div class="style-swatch">
                ${info.colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join("")}
            </div>
        </div>`;
    });
    html += '</div>';

    await addBotMsg(html, 0);
    clearInput();
}

window.selectStyle = async function(index) {
    if (step !== "style") return;
    const preset = PRESETS[index];
    if (!preset) return;

    ebook.design = structuredClone(preset.design);
    document.querySelectorAll(".style-card").forEach((el, i) => {
        el.classList.toggle("selected", i === index);
    });

    addUserMsg(preset.name);
    await addBotMsg(`<strong>${preset.name}</strong> — great choice.`, 300);
    await askBrand();
};

async function askBrand() {
    step = "brand";

    let html = "Add your <strong>logo</strong> and <strong>brand color</strong>, or skip.";
    html += `<div style="margin-top:12px">
        <div class="file-upload-area">
            <label><span>Upload Logo</span>
                <input type="file" id="logo-upload" accept="image/*" onchange="window.handleLogoUpload(this)">
            </label>
            <span class="file-name" id="logo-filename">No file chosen</span>
        </div>
        <div class="color-pick-row">
            <label>Brand name:
                <input type="text" id="brand-name-input" placeholder="${escapeAttr(ebook.author)}" value=""
                    style="width:140px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-size:0.85rem;">
            </label>
            <label>Accent:
                <input type="color" id="accent-color-input" value="${ebook.design?.colors?.accent || '#8A9E8C'}">
            </label>
        </div>
    </div>`;

    await addBotMsg(html, 400);

    showButtons([
        { label: "Next — review chapters", cls: "btn-primary", onClick: () => { captureBrand(); showChapterReview(); } },
        { label: "Skip", cls: "btn-secondary btn-small", onClick: () => { showChapterReview(); } },
    ]);
}

function captureBrand() {
    const brandInput = document.getElementById("brand-name-input");
    const accentInput = document.getElementById("accent-color-input");
    if (brandInput) ebook.brand = brandInput.value.trim();
    if (accentInput && ebook.design) ebook.design.colors.accent = accentInput.value;
}

// =========================================================================
// FLOW: Step 5 — Chapter review
// =========================================================================

async function showChapterReview() {
    step = "review";
    clearInput();
    captureBrand();

    const totalWords = ebook.chapters.reduce((s, ch) => s + ch.content.split(/\s+/).filter(Boolean).length, 0);
    await addBotMsg(
        `Here are your <strong>${ebook.chapters.length} chapters</strong> (${totalWords.toLocaleString()} words). Edit titles or remove any you don't need:`,
        400,
    );

    let html = '<div class="chapter-outline" id="chapter-outline">';
    ebook.chapters.forEach((ch, i) => {
        const wordCount = ch.content.split(/\s+/).filter(Boolean).length;
        html += `<div class="outline-item" data-index="${i}">
            <span class="outline-num">${i + 1}</span>
            <input type="text" class="outline-title" value="${escapeAttr(ch.title)}"
                onchange="window.updateChapterTitle(${i}, this.value)">
            <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap">${wordCount}w</span>
            <button class="btn-danger" onclick="window.removeChapter(${i})">x</button>
        </div>`;
    });
    html += '</div>';

    await addBotMsg(html, 0);

    showButtons([
        { label: "Generate my ebook!", cls: "btn-primary", onClick: () => { syncTitles(); generateEbook(); } },
        { label: "+ Add chapter", cls: "btn-secondary btn-small", onClick: addChapterManually },
    ]);
}

function syncTitles() {
    document.querySelectorAll(".outline-title").forEach((input, i) => {
        if (ebook.chapters[i]) ebook.chapters[i].title = input.value;
    });
}

window.updateChapterTitle = function(i, val) {
    if (ebook.chapters[i]) ebook.chapters[i].title = val;
};

window.removeChapter = function(i) {
    ebook.chapters.splice(i, 1);
    const el = document.querySelector(".chapter-outline");
    if (el) el.closest(".msg").remove();
    showChapterReview();
};

async function addChapterManually() {
    syncTitles();
    clearInput();
    const num = ebook.chapters.length + 1;
    await addBotMsg(`<strong>Title for Chapter ${num}?</strong>`, 300);
    showTextInput("Chapter title...", async (title) => {
        addUserMsg(title);
        clearInput();
        ebook.chapters.push({ title, content: "" });
        const idx = ebook.chapters.length - 1;
        await addBotMsg(`Paste the content for <strong>"${title}"</strong>.`, 300);
        showTextArea("Paste chapter content...", async (content) => {
            addUserMsg(`[${content.length} characters]`);
            ebook.chapters[idx].content = content;
            clearInput();
            await showChapterReview();
        }, "Save");
    });
}

window.handleLogoUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById("logo-filename").textContent = file.name;
    const formData = new FormData();
    formData.append("file", file);
    try {
        const resp = await fetch("/api/upload-logo", { method: "POST", body: formData });
        const data = await resp.json();
        if (data.path) {
            ebook.logoPath = data.path;
            ebook.logoFilename = data.filename || file.name;
        }
    } catch (e) {
        document.getElementById("logo-filename").textContent = "Upload failed";
    }
};

// =========================================================================
// FLOW: Step 7 — Generate PDF
// =========================================================================

async function generateEbook() {
    clearInput();
    step = "generating";

    const chCount = ebook.chapters.filter(ch => ch.content.trim()).length;
    const totalWords = ebook.chapters.reduce((s, ch) => s + ch.content.split(/\s+/).filter(Boolean).length, 0);

    await addBotMsg(
        `Building your ebook:<br>` +
        `<strong>${ebook.title}</strong>${ebook.subtitle ? " — <em>" + ebook.subtitle + "</em>" : ""}<br>` +
        `By ${ebook.author} &middot; ${chCount} chapters &middot; ${totalWords.toLocaleString()} words` +
        (ebook.logoFilename ? ` &middot; Logo: ${ebook.logoFilename}` : ""),
        300,
    );

    await addBotMsg(
        'Generating PDF...<div class="progress-bar"><div class="fill" id="gen-progress" style="width:10%"></div></div>',
        200,
    );

    const progressEl = document.getElementById("gen-progress");
    let progress = 10;
    const interval = setInterval(() => {
        progress = Math.min(progress + 8, 90);
        if (progressEl) progressEl.style.width = progress + "%";
    }, 200);

    const config = buildConfig();

    try {
        const resp = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });

        clearInterval(interval);
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || "Generation failed");
        }

        if (progressEl) progressEl.style.width = "100%";

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);

        await addBotMsg(
            `Your ebook is ready!<br>` +
            `<button class="download-btn" onclick="window.downloadFile('${url}', '${escapeAttr(config.filename)}')">Download PDF</button>`,
            400,
        );

        await addBotMsg("Want to create another? Just refresh the page.", 600);
        step = "done";
        clearInput();
    } catch (err) {
        clearInterval(interval);
        await addBotMsg(`Something went wrong: <strong>${err.message}</strong>`, 300);
        showButtons([
            { label: "Try again", cls: "btn-primary", onClick: generateEbook },
        ]);
    }
}

window.downloadFile = function(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// =========================================================================
// BUILD PDF CONFIG
// =========================================================================

function buildConfig() {
    const pages = [];

    const coverData = {
        title: ebook.title,
        subtitle: ebook.subtitle ? [ebook.subtitle] : [],
        brand: ebook.brand || ebook.author,
        author: ebook.author,
    };
    if (ebook.logoPath) coverData.logo_path = ebook.logoPath;
    pages.push({ type: "cover", data: coverData });

    const filled = ebook.chapters.filter(ch => ch.content.trim());
    if (filled.length >= 2) {
        pages.push({
            type: "toc",
            data: {
                heading: "What\u2019s Inside",
                entries: filled.map((ch, i) => ({
                    number: String(i + 1),
                    title: ch.title || `Chapter ${i + 1}`,
                    description: "",
                })),
            },
        });
    }

    filled.forEach((ch, i) => {
        const paragraphs = ch.content
            .split(/\n\n+/)
            .flatMap(p => {
                const trimmed = p.trim();
                return trimmed ? [trimmed, ""] : [];
            });
        pages.push({
            type: "chapter",
            data: {
                chapter_number: String(i + 1),
                chapter_title: ch.title || `Chapter ${i + 1}`,
                paragraphs,
            },
        });
    });

    pages.push({
        type: "cta",
        data: {
            headline: ["Thank you for reading."],
            bridge: ebook.subtitle || "",
            links: [],
            sign_off: `\u2014 ${ebook.author || "The Author"}`,
        },
    });

    return {
        title: ebook.title,
        subtitle: ebook.subtitle,
        author: ebook.author,
        filename: ebook.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + ".pdf",
        design: ebook.design,
        links: {},
        pages,
    };
}

function escapeAttr(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}
