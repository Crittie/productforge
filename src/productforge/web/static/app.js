/**
 * ProductForge — Ebook PDF Designer.
 * Bring your content (paste, type, or upload). We design it and generate the PDF.
 */

const PRESETS = window.__PRESETS__ || [];
const messagesEl = document.getElementById("chat-messages");
const inputZone = document.getElementById("input-zone");

// Ebook state
const ebook = {
    title: "",
    subtitle: "",
    author: "",
    brand: "",
    filename: "ebook.pdf",
    design: null,
    logoPath: "",
    logoFilename: "",
    chapters: [],       // [{title, content}]
};

let step = "greeting";

// --- Init ---
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

function showTextInput(placeholder, onSubmit) {
    clearInput();
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && input.value.trim()) onSubmit(input.value.trim());
    });
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Send";
    btn.addEventListener("click", () => {
        if (input.value.trim()) onSubmit(input.value.trim());
    });
    inputZone.appendChild(input);
    inputZone.appendChild(btn);
    input.focus();
}

function showTextArea(placeholder, onSubmit, btnLabel) {
    clearInput();
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:8px;width:100%";
    const ta = document.createElement("textarea");
    ta.placeholder = placeholder;
    ta.rows = 5;
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
// CHAT FLOW
// =========================================================================

async function startChat() {
    await addBotMsg("Hey! I'm <strong>ProductForge</strong> — I turn your content into a professionally designed ebook PDF.", 400);
    await addBotMsg("Bring your content from <strong>ChatGPT, Claude, your own writing</strong> — whatever you've got. I'll handle the design and layout.", 600);
    await addBotMsg("First, let's get the basics. <strong>What's the title of your ebook?</strong>", 500);

    step = "title";
    showTextInput("e.g. The Vegan Protein Playbook", handleTitle);
}

// --- Step 1: Title ---
async function handleTitle(text) {
    addUserMsg(text);
    clearInput();

    // Parse title:subtitle from colon or em-dash
    const parts = text.split(/[:\u2014—]/);
    if (parts.length >= 2) {
        ebook.title = parts[0].trim();
        ebook.subtitle = parts.slice(1).join(" — ").trim();
    } else {
        ebook.title = text;
    }

    await addBotMsg(`<strong>"${ebook.title}"</strong>${ebook.subtitle ? " — " + ebook.subtitle : ""}. Great title.`, 300);
    await addBotMsg("Does your ebook have a <strong>subtitle</strong>? If you already included it above, just hit skip.", 400);

    step = "subtitle";
    showTextInput("e.g. A Complete Guide to Plant-Based Protein", (text) => handleSubtitle(text));

    // Add skip button alongside the input
    const skipBtn = document.createElement("button");
    skipBtn.className = "btn btn-secondary btn-small";
    skipBtn.textContent = "Skip";
    skipBtn.style.marginLeft = "4px";
    skipBtn.addEventListener("click", () => handleSubtitle(""));
    inputZone.appendChild(skipBtn);
}

// --- Step 2: Subtitle ---
async function handleSubtitle(text) {
    if (text) {
        addUserMsg(text);
        ebook.subtitle = text;
    }
    clearInput();

    await addBotMsg("<strong>Who's the author?</strong> Name that goes on the cover.", 400);

    step = "author";
    showTextInput("Your name or pen name", handleAuthor);
}

// --- Step 3: Author ---
async function handleAuthor(text) {
    addUserMsg(text);
    clearInput();
    ebook.author = text;

    await addBotMsg(`By <strong>${ebook.author}</strong>. Now for the content.`, 300);
    await askContentMethod();
}

// --- Step 4: Content input method ---
async function askContentMethod() {
    step = "content-method";

    await addBotMsg(
        "How do you want to add your content? Pick the option that fits best:",
        500,
    );

    let html = '<div class="option-cards">';
    html += `<div class="option-card" onclick="window.selectContentMethod('paste')">
        <div class="option-label">Paste all content at once</div>
        <div class="option-desc">Paste everything — I'll auto-detect chapters from your headings</div>
    </div>`;
    html += `<div class="option-card" onclick="window.selectContentMethod('chapter')">
        <div class="option-label">Add chapters one by one</div>
        <div class="option-desc">Add each chapter title + content separately</div>
    </div>`;
    html += `<div class="option-card" onclick="window.selectContentMethod('upload')">
        <div class="option-label">Upload a text file</div>
        <div class="option-desc">Upload a .txt or .md file with your content</div>
    </div>`;
    html += '</div>';

    await addBotMsg(html, 0);
    clearInput();
}

window.selectContentMethod = async function(method) {
    if (step !== "content-method") return;

    document.querySelectorAll(".option-card").forEach(el => {
        el.classList.remove("selected");
    });
    event.target.closest(".option-card")?.classList.add("selected");

    if (method === "paste") {
        addUserMsg("Paste all content");
        await askPasteContent();
    } else if (method === "chapter") {
        addUserMsg("Add chapters one by one");
        await askChapterByChapter();
    } else if (method === "upload") {
        addUserMsg("Upload a file");
        await askFileUpload();
    }
};

// --- Content method: Paste all ---
async function askPasteContent() {
    step = "paste";

    await addBotMsg(
        "Paste your ebook content below. I'll split it into chapters automatically.<br><br>" +
        "<strong>Tip:</strong> Use headings like <em>Chapter 1: Title</em> or <em># Title</em> or just <em>ALL CAPS LINES</em> — I'll detect them as chapter breaks.",
        500,
    );

    showTextArea(
        "Paste your full ebook content here...\n\nChapter 1: Introduction\nYour text goes here...\n\nChapter 2: Getting Started\nMore text here...",
        handlePastedContent,
        "Process content"
    );
}

function parseChaptersFromText(text) {
    const chapters = [];
    // Split on common chapter heading patterns
    // Pattern: "Chapter N: Title", "# Title", "## Title", or ALL CAPS lines (3+ words)
    const lines = text.split("\n");
    let currentTitle = "";
    let currentContent = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Detect chapter headings
        const chapterMatch = trimmed.match(/^(?:chapter\s+\d+\s*[:.\-—]\s*|#{1,3}\s+)(.+)/i);
        const allCapsMatch = trimmed.match(/^[A-Z][A-Z\s:—\-]{10,}$/) && trimmed.split(/\s+/).length >= 3;
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);

        if (chapterMatch || allCapsMatch || numberedMatch) {
            // Save previous chapter
            if (currentTitle || currentContent.length > 0) {
                chapters.push({
                    title: currentTitle || `Chapter ${chapters.length + 1}`,
                    content: currentContent.join("\n").trim(),
                });
            }

            if (chapterMatch) {
                currentTitle = chapterMatch[1].trim();
            } else if (numberedMatch) {
                currentTitle = numberedMatch[2].trim();
            } else {
                // ALL CAPS → title-case it
                currentTitle = trimmed.split(/\s+/).map(w =>
                    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                ).join(" ");
            }
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    // Save last chapter
    if (currentTitle || currentContent.length > 0) {
        chapters.push({
            title: currentTitle || `Chapter ${chapters.length + 1}`,
            content: currentContent.join("\n").trim(),
        });
    }

    // If no headings were found, treat it as a single chapter
    if (chapters.length === 1 && !chapters[0].title.startsWith("Chapter")) {
        // Keep as-is — single chapter
    } else if (chapters.length === 0) {
        chapters.push({ title: "Chapter 1", content: text.trim() });
    }

    return chapters;
}

async function handlePastedContent(text) {
    addUserMsg(`[Pasted ${text.length} characters]`);
    clearInput();

    const chapters = parseChaptersFromText(text);
    ebook.chapters = chapters;

    await addBotMsg(`Found <strong>${chapters.length} chapter${chapters.length !== 1 ? "s" : ""}</strong> in your content:`, 400);
    await showChapterReview();
}

// --- Content method: Chapter by chapter ---
async function askChapterByChapter() {
    step = "chapter-add";
    ebook.chapters = [];

    await addBotMsg(
        `Let's add your chapters. <strong>What's the title of Chapter 1?</strong>`,
        400,
    );

    showTextInput("Chapter title...", handleChapterTitle);
}

async function handleChapterTitle(text) {
    addUserMsg(text);
    clearInput();

    ebook.chapters.push({ title: text, content: "" });
    const idx = ebook.chapters.length - 1;

    await addBotMsg(`<strong>Chapter ${idx + 1}: "${text}"</strong><br>Now paste the content for this chapter.`, 400);

    showTextArea(
        "Paste or write the chapter content...",
        (content) => handleChapterBodyInput(idx, content),
        "Save chapter"
    );
}

async function handleChapterBodyInput(index, text) {
    addUserMsg(`[${text.length} characters]`);
    clearInput();

    ebook.chapters[index].content = text;

    await addBotMsg(`Chapter ${index + 1} saved. <strong>Add another chapter, or continue to design.</strong>`, 300);

    showButtons([
        { label: "+ Add another chapter", cls: "btn-secondary", onClick: () => addNextChapter() },
        { label: "Done — let's design it", cls: "btn-primary", onClick: () => showChapterReview() },
    ]);
}

async function addNextChapter() {
    clearInput();
    const num = ebook.chapters.length + 1;
    await addBotMsg(`<strong>What's the title of Chapter ${num}?</strong>`, 300);
    showTextInput("Chapter title...", handleChapterTitle);
}

// --- Content method: File upload ---
async function askFileUpload() {
    step = "upload";

    let html = "Upload a <strong>.txt</strong> or <strong>.md</strong> file with your ebook content.";
    html += `<div style="margin-top:12px">
        <div class="file-upload-area">
            <label><span>Choose file</span>
                <input type="file" id="content-file-upload" accept=".txt,.md,.text,.markdown" onchange="window.handleContentUpload(this)">
            </label>
            <span class="file-name" id="content-filename">No file chosen</span>
        </div>
    </div>`;
    html += '<div style="margin-top:6px;font-size:0.78rem;color:var(--muted)">I\'ll detect chapters from headings (# Title, Chapter N:, ALL CAPS lines)</div>';

    await addBotMsg(html, 400);
    clearInput();
}

window.handleContentUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;

    document.getElementById("content-filename").textContent = file.name;

    try {
        const text = await file.text();
        addUserMsg(`Uploaded: ${file.name} (${text.length} characters)`);

        const chapters = parseChaptersFromText(text);
        ebook.chapters = chapters;

        await addBotMsg(`Found <strong>${chapters.length} chapter${chapters.length !== 1 ? "s" : ""}</strong> in <em>${file.name}</em>:`, 400);
        await showChapterReview();
    } catch (e) {
        await addBotMsg("Couldn't read that file. Try a .txt or .md file.", 300);
    }
};

// =========================================================================
// CHAPTER REVIEW (shared by all content methods)
// =========================================================================

async function showChapterReview() {
    step = "review";

    let html = '<div class="chapter-outline" id="chapter-outline">';
    ebook.chapters.forEach((ch, i) => {
        const wordCount = ch.content.split(/\s+/).filter(Boolean).length;
        html += `<div class="outline-item" data-index="${i}">
            <span class="outline-num">${i + 1}</span>
            <input type="text" class="outline-title" value="${escapeAttr(ch.title)}"
                onchange="window.updateChapterTitle(${i}, this.value)">
            <span style="font-size:0.75rem;color:var(--muted);white-space:nowrap">${wordCount} words</span>
            <button class="btn-danger" onclick="window.removeChapter(${i})">x</button>
        </div>`;
    });
    html += '</div>';

    const totalWords = ebook.chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0);
    html += `<div style="margin-top:8px;font-size:0.82rem;color:var(--muted)">${totalWords} total words &middot; Edit titles above or remove chapters</div>`;

    await addBotMsg(html, 400);

    showButtons([
        { label: "Looks good — design my ebook", cls: "btn-primary", onClick: () => { syncChapterTitles(); askStyle(); } },
        { label: "+ Add a chapter", cls: "btn-secondary btn-small", onClick: addChapterFromReview },
    ]);
}

function syncChapterTitles() {
    document.querySelectorAll(".outline-title").forEach((input, i) => {
        if (ebook.chapters[i]) ebook.chapters[i].title = input.value;
    });
}

window.updateChapterTitle = function(index, value) {
    if (ebook.chapters[index]) ebook.chapters[index].title = value;
};

window.removeChapter = function(index) {
    ebook.chapters.splice(index, 1);
    const el = document.querySelector(".chapter-outline");
    if (el) el.closest(".msg").remove();
    showChapterReview();
};

async function addChapterFromReview() {
    syncChapterTitles();
    clearInput();
    const num = ebook.chapters.length + 1;
    await addBotMsg(`<strong>What's the title of Chapter ${num}?</strong>`, 300);

    step = "chapter-add-from-review";
    showTextInput("Chapter title...", async (title) => {
        addUserMsg(title);
        clearInput();
        ebook.chapters.push({ title, content: "" });
        const idx = ebook.chapters.length - 1;

        await addBotMsg(`Paste the content for <strong>"${title}"</strong>.`, 300);
        showTextArea("Paste or write the chapter content...", async (content) => {
            addUserMsg(`[${content.length} characters]`);
            clearInput();
            ebook.chapters[idx].content = content;
            await addBotMsg(`Chapter ${idx + 1} added.`, 200);
            await showChapterReview();
        }, "Save chapter");
    });
}

// =========================================================================
// DESIGN STEPS
// =========================================================================

// --- Step 5: Design style ---
async function askStyle() {
    step = "style";

    const swatches = {
        "Editorial": { colors: ["#F7F4EF", "#111110", "#8A9E8C", "#A09890"], vibe: "Elegant, literary, lots of white space" },
        "Clean": { colors: ["#1a2744", "#e17055", "#ffffff", "#f5f6fa"], vibe: "Bold, professional, business-ready" },
        "Warm": { colors: ["#1a1a2e", "#F4C430", "#B4A7D6", "#e8e8e8"], vibe: "Dark & moody, premium feel" },
    };

    await addBotMsg("Now let's make it look great. <strong>Pick a design style:</strong>", 500);

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
    await addBotMsg(`<strong>${preset.name}</strong> — nice choice.`, 300);
    await askBrand();
};

// --- Step 6: Branding ---
async function askBrand() {
    step = "brand";

    let html = "Last step — your branding. Add a <strong>logo</strong> (optional) and customize your <strong>brand name</strong> and <strong>accent color</strong>.";
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

    await addBotMsg(html, 500);

    showButtons([
        { label: "Generate my ebook!", cls: "btn-primary", onClick: confirmAndGenerate },
        { label: "Skip — use defaults", cls: "btn-secondary", onClick: confirmAndGenerate },
    ]);
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
// GENERATE
// =========================================================================

async function confirmAndGenerate() {
    const brandInput = document.getElementById("brand-name-input");
    const accentInput = document.getElementById("accent-color-input");
    if (brandInput) ebook.brand = brandInput.value.trim();
    if (accentInput && ebook.design) ebook.design.colors.accent = accentInput.value;

    clearInput();
    step = "generating";

    const chCount = ebook.chapters.filter(ch => ch.content.trim()).length;
    const totalWords = ebook.chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0);

    await addBotMsg(
        `Building your ebook:<br><br>` +
        `<strong>${ebook.title}</strong>${ebook.subtitle ? "<br><em>" + ebook.subtitle + "</em>" : ""}<br>` +
        `By ${ebook.author}<br>` +
        `${chCount} chapters &middot; ${totalWords} words &middot; ${ebook.design?.layout || "editorial"} style` +
        (ebook.logoFilename ? `<br>Logo: ${ebook.logoFilename}` : ""),
        400,
    );

    await addBotMsg(
        'Generating your PDF...<div class="progress-bar"><div class="fill" id="gen-progress" style="width:10%"></div></div>',
        300,
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
            `Your ebook is ready!<br><br>` +
            `<strong>"${ebook.title}"</strong> — ${chCount} chapters, ${ebook.design?.layout} style.<br>` +
            `<button class="download-btn" onclick="window.downloadFile('${url}', '${escapeAttr(config.filename)}')">Download PDF</button>`,
            500,
        );

        await addBotMsg("Want to create another ebook? Just refresh the page.", 700);
        step = "done";
        clearInput();
    } catch (err) {
        clearInterval(interval);
        await addBotMsg(`Something went wrong: <strong>${err.message}</strong>`, 300);
        showButtons([
            { label: "Try again", cls: "btn-primary", onClick: confirmAndGenerate },
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

    // Cover
    const coverData = {
        title: ebook.title,
        subtitle: ebook.subtitle ? [ebook.subtitle] : [],
        brand: ebook.brand || ebook.author,
        author: ebook.author,
    };
    if (ebook.logoPath) coverData.logo_path = ebook.logoPath;
    pages.push({ type: "cover", data: coverData });

    // TOC
    const filledChapters = ebook.chapters.filter(ch => ch.content.trim());
    if (filledChapters.length >= 2) {
        pages.push({
            type: "toc",
            data: {
                heading: "What\u2019s Inside",
                entries: filledChapters.map((ch, i) => ({
                    number: String(i + 1),
                    title: ch.title || `Chapter ${i + 1}`,
                    description: "",
                })),
            },
        });
    }

    // Chapters
    filledChapters.forEach((ch, i) => {
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
                paragraphs: paragraphs,
            },
        });
    });

    // CTA
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
        pages: pages,
    };
}

// =========================================================================
// UTILITY
// =========================================================================

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}
