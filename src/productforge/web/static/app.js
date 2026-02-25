/**
 * ProductForge — Chatbot-guided ebook generator.
 * State machine walks user through: topic → style → branding → chapters → generate.
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
    logoPath: "",       // server path after upload
    logoFilename: "",   // display name
    accentColor: "",    // user override
    chapters: [],       // [{title, content}]
};

// Steps: greeting → topic → style → brand → chapters → confirm → generate
let step = "greeting";

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => startChat(), 300);
});

// --- Chat helpers ---

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

// --- Input renderers ---

function showTextInput(placeholder, onSubmit) {
    clearInput();
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && input.value.trim()) {
            onSubmit(input.value.trim());
        }
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
    const ta = document.createElement("textarea");
    ta.placeholder = placeholder;
    ta.rows = 2;
    ta.addEventListener("input", () => {
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    });

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = btnLabel || "Send";
    btn.addEventListener("click", () => {
        if (ta.value.trim()) onSubmit(ta.value.trim());
    });

    inputZone.appendChild(ta);
    inputZone.appendChild(btn);
    ta.focus();
}

function showButtons(buttons) {
    clearInput();
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.flexWrap = "wrap";
    wrap.style.width = "100%";
    buttons.forEach(({ label, cls, onClick }) => {
        const btn = document.createElement("button");
        btn.className = `btn ${cls || "btn-primary"}`;
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        wrap.appendChild(btn);
    });
    inputZone.appendChild(wrap);
}

// --- Chat flow ---

async function startChat() {
    await addBotMsg("Hey! I'm <strong>ProductForge</strong> — I'll help you create a professional ebook PDF in a few steps.", 400);
    await addBotMsg("Let's start. <strong>What's your ebook about?</strong> Give me the title and a brief description of what it covers.", 600);
    step = "topic";
    showTextInput("e.g. The Car Flipper's Playbook — how to flip cars for profit", handleTopic);
}

async function handleTopic(text) {
    addUserMsg(text);
    clearInput();

    // Try to extract a title from the input
    const parts = text.split(/[—\-:]/);
    if (parts.length >= 2) {
        ebook.title = parts[0].trim();
        ebook.subtitle = parts.slice(1).join(" — ").trim();
    } else {
        ebook.title = text;
    }

    await addBotMsg(`Great — <strong>"${ebook.title}"</strong>${ebook.subtitle ? " — " + ebook.subtitle : ""}. Sounds good!`, 400);
    await addBotMsg("Who's the author? (This goes on the cover page.)", 500);
    step = "author";
    showTextInput("Your name", handleAuthor);
}

async function handleAuthor(text) {
    addUserMsg(text);
    clearInput();
    ebook.author = text;

    await addBotMsg(`Got it, <strong>${ebook.author}</strong>.`, 300);
    await askStyle();
}

async function askStyle() {
    // Build style card HTML
    const swatches = {
        "Editorial": ["#F7F4EF", "#111110", "#8A9E8C", "#A09890"],
        "Clean": ["#1a2744", "#e17055", "#ffffff", "#f5f6fa"],
        "Warm": ["#1a1a2e", "#F4C430", "#B4A7D6", "#e8e8e8"],
    };

    let cardsHtml = '<div class="style-cards">';
    PRESETS.forEach((p, i) => {
        const colors = swatches[p.name] || ["#333", "#666", "#999", "#ccc"];
        cardsHtml += `
            <div class="style-card" data-index="${i}" onclick="selectStyle(${i})">
                <div class="style-name">${p.name}</div>
                <div class="style-desc">${p.description || ""}</div>
                <div class="style-swatch">
                    ${colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join("")}
                </div>
            </div>
        `;
    });
    cardsHtml += '</div>';

    await addBotMsg("Pick a design style for your ebook:" + cardsHtml, 500);
    step = "style";
    clearInput();
    // Input comes from card click
}

window.selectStyle = async function(index) {
    if (step !== "style") return;
    const preset = PRESETS[index];
    if (!preset) return;

    ebook.design = structuredClone(preset.design);

    // Highlight selected card
    document.querySelectorAll(".style-card").forEach((el, i) => {
        el.classList.toggle("selected", i === index);
    });

    addUserMsg(preset.name);
    await addBotMsg(`Nice — <strong>${preset.name}</strong> style selected.`, 300);
    await askBrand();
};

async function askBrand() {
    step = "brand";

    let html = "Now let's add your branding. Upload a <strong>logo</strong> (optional) and set a <strong>brand name</strong> and <strong>accent color</strong>.";
    html += `
        <div style="margin-top:12px">
            <div class="file-upload-area">
                <label>
                    <span>Upload Logo</span>
                    <input type="file" id="logo-upload" accept="image/*" onchange="handleLogoUpload(this)">
                </label>
                <span class="file-name" id="logo-filename">No file chosen</span>
            </div>
            <div class="color-pick-row">
                <label>Brand name:
                    <input type="text" id="brand-name-input" placeholder="${ebook.author}" value=""
                        style="width:140px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-size:0.85rem;">
                </label>
                <label>Accent:
                    <input type="color" id="accent-color-input" value="${ebook.design?.colors?.accent || '#8A9E8C'}">
                </label>
            </div>
        </div>
    `;

    const msgEl = await addBotMsg(html, 500);

    showButtons([
        { label: "Continue", cls: "btn-primary", onClick: finishBrand },
        { label: "Skip branding", cls: "btn-secondary", onClick: finishBrand },
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

async function finishBrand() {
    const brandInput = document.getElementById("brand-name-input");
    const accentInput = document.getElementById("accent-color-input");

    ebook.brand = brandInput ? brandInput.value.trim() : "";
    if (accentInput && ebook.design) {
        ebook.design.colors.accent = accentInput.value;
    }

    const brandText = ebook.brand || ebook.author;
    addUserMsg(`Brand: ${brandText}${ebook.logoFilename ? " + logo" : ""}`);
    clearInput();

    await addBotMsg("Now for the content. Add your <strong>chapters</strong> — give each one a title and its content.", 500);
    await showChapterEditor();
}

// --- Chapter editor ---

async function showChapterEditor() {
    step = "chapters";

    // Start with one empty chapter
    if (ebook.chapters.length === 0) {
        ebook.chapters.push({ title: "", content: "" });
    }

    renderChapterUI();
}

function renderChapterUI() {
    // Build chapter editor in a bot message
    let html = '<div class="chapter-editor" id="chapter-editor">';

    ebook.chapters.forEach((ch, i) => {
        html += `
            <div class="chapter-block" data-index="${i}">
                <div class="ch-header">
                    <span class="ch-num">Chapter ${i + 1}</span>
                    ${ebook.chapters.length > 1 ?
                        `<button class="btn-danger" onclick="removeChapter(${i})">Remove</button>` : ""}
                </div>
                <input type="text" placeholder="Chapter title"
                    value="${escapeHtml(ch.title)}"
                    onchange="updateChapter(${i}, 'title', this.value)">
                <textarea placeholder="Chapter content — write your paragraphs here (separate with blank lines)"
                    onchange="updateChapter(${i}, 'content', this.value)">${escapeHtml(ch.content)}</textarea>
            </div>
        `;
    });

    html += '</div>';

    // Remove any existing editor message
    const existing = document.getElementById("chapter-editor-msg");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.className = "msg bot";
    div.id = "chapter-editor-msg";
    div.innerHTML = html;
    messagesEl.appendChild(div);
    scrollBottom();

    showButtons([
        { label: "+ Add Chapter", cls: "btn-secondary btn-small", onClick: addChapter },
        { label: "Done — Generate my ebook", cls: "btn-primary", onClick: confirmGenerate },
    ]);
}

window.updateChapter = function(index, field, value) {
    if (ebook.chapters[index]) {
        ebook.chapters[index][field] = value;
    }
};

window.removeChapter = function(index) {
    ebook.chapters.splice(index, 1);
    const existing = document.getElementById("chapter-editor-msg");
    if (existing) existing.remove();
    renderChapterUI();
};

function addChapter() {
    // Sync current input values before re-render
    syncChapterInputs();
    ebook.chapters.push({ title: "", content: "" });
    const existing = document.getElementById("chapter-editor-msg");
    if (existing) existing.remove();
    renderChapterUI();
}

function syncChapterInputs() {
    const blocks = document.querySelectorAll(".chapter-block");
    blocks.forEach((block, i) => {
        if (!ebook.chapters[i]) return;
        const titleInput = block.querySelector('input[type="text"]');
        const contentInput = block.querySelector("textarea");
        if (titleInput) ebook.chapters[i].title = titleInput.value;
        if (contentInput) ebook.chapters[i].content = contentInput.value;
    });
}

// --- Confirm & Generate ---

async function confirmGenerate() {
    syncChapterInputs();

    // Filter out empty chapters
    ebook.chapters = ebook.chapters.filter(ch => ch.title.trim() || ch.content.trim());

    if (ebook.chapters.length === 0) {
        await addBotMsg("You need at least one chapter with some content. Add a title and some text, then try again.", 300);
        return;
    }

    const chapterCount = ebook.chapters.length;
    addUserMsg(`${chapterCount} chapter${chapterCount > 1 ? "s" : ""} ready`);
    clearInput();

    // Build summary
    let summary = `Here's your ebook:<br><br>`;
    summary += `<strong>${ebook.title}</strong>`;
    if (ebook.subtitle) summary += `<br><em>${ebook.subtitle}</em>`;
    summary += `<br>By ${ebook.author || "Unknown"}`;
    summary += `<br>${chapterCount} chapter${chapterCount > 1 ? "s" : ""}`;
    summary += `<br>Style: ${ebook.design?.layout || "editorial"}`;
    if (ebook.logoFilename) summary += `<br>Logo: ${ebook.logoFilename}`;

    await addBotMsg(summary, 400);
    await addBotMsg("Ready to generate?", 300);

    step = "confirm";
    showButtons([
        { label: "Generate PDF", cls: "btn-primary", onClick: generateEbook },
        { label: "Edit chapters", cls: "btn-secondary", onClick: () => { step = "chapters"; showChapterEditor(); } },
    ]);
}

async function generateEbook() {
    clearInput();
    step = "generating";

    const msgEl = await addBotMsg('Generating your ebook...<div class="progress-bar"><div class="fill" id="gen-progress" style="width:10%"></div></div>', 200);

    // Animate progress
    const progressEl = document.getElementById("gen-progress");
    let progress = 10;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + 8, 90);
        if (progressEl) progressEl.style.width = progress + "%";
    }, 200);

    // Build the config
    const config = buildConfig();

    try {
        const resp = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });

        clearInterval(progressInterval);

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || "Generation failed");
        }

        if (progressEl) progressEl.style.width = "100%";

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);

        // Replace progress with download button
        await addBotMsg(
            `Your ebook is ready! <strong>${ebook.chapters.length} chapters, ` +
            `${ebook.design?.layout} style.</strong><br>` +
            `<button class="download-btn" onclick="downloadFile('${url}', '${config.filename}')">` +
            `Download PDF</button>`,
            400
        );

        await addBotMsg("Want to make another ebook? Just refresh the page.", 600);
        step = "done";
        clearInput();

    } catch (err) {
        clearInterval(progressInterval);
        await addBotMsg(`Something went wrong: <strong>${err.message}</strong><br>Check your content and try again.`, 300);
        showButtons([
            { label: "Try again", cls: "btn-primary", onClick: generateEbook },
            { label: "Edit chapters", cls: "btn-secondary", onClick: () => { step = "chapters"; showChapterEditor(); } },
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

// --- Build PDF config from ebook state ---

function buildConfig() {
    const pages = [];

    // Cover page
    const coverData = {
        title: ebook.title,
        subtitle: ebook.subtitle ? [ebook.subtitle] : [],
        brand: ebook.brand || ebook.author,
        author: ebook.author,
    };
    if (ebook.logoPath) {
        coverData.logo_path = ebook.logoPath;
    }
    pages.push({ type: "cover", data: coverData });

    // TOC page (if 2+ chapters)
    if (ebook.chapters.length >= 2) {
        pages.push({
            type: "toc",
            data: {
                heading: "What\u2019s Inside",
                entries: ebook.chapters.map((ch, i) => ({
                    number: String(i + 1),
                    title: ch.title || `Chapter ${i + 1}`,
                    description: "",
                })),
            },
        });
    }

    // Chapters
    ebook.chapters.forEach((ch, i) => {
        const paragraphs = ch.content
            .split(/\n\n+/)                    // Split on blank lines → paragraphs
            .flatMap(p => {
                const trimmed = p.trim();
                return trimmed ? [trimmed, ""] : [];  // Add spacing between
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

    // CTA page
    pages.push({
        type: "cta",
        data: {
            headline: ["Thank you for reading."],
            bridge: ebook.subtitle || "",
            links: [],
            sign_off: `\u2014 ${ebook.author || "The Author"}`,
        },
    });

    const filename = ebook.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + ".pdf";

    return {
        title: ebook.title,
        subtitle: ebook.subtitle,
        author: ebook.author,
        filename: filename,
        design: ebook.design,
        links: {},
        pages: pages,
    };
}

// --- Utility ---

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}
