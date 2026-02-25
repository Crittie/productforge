/**
 * ProductForge — AI-guided ebook creator.
 * Coaches the user through niche discovery, ebook concept,
 * chapter outlines, and content development before generating.
 */

const PRESETS = window.__PRESETS__ || [];
const messagesEl = document.getElementById("chat-messages");
const inputZone = document.getElementById("input-zone");

// Ebook state
const ebook = {
    expertise: "",
    audience: "",
    problem: "",
    concept: "",
    title: "",
    subtitle: "",
    author: "",
    brand: "",
    filename: "ebook.pdf",
    design: null,
    logoPath: "",
    logoFilename: "",
    chapters: [],       // [{title, guideQuestion, content}]
};

let step = "greeting";

// --- Ebook structure templates ---
const EBOOK_STRUCTURES = {
    "how-to": {
        label: "How-To Guide",
        desc: "Step-by-step playbook your reader can follow",
        chapters: (topic, audience) => [
            { title: `Why ${topic} Matters Right Now`, guide: `What's changed recently that makes ${topic} urgent or important? Why should ${audience} care today vs. a year ago?` },
            { title: "The Biggest Mistakes (And How to Avoid Them)", guide: `What are the top 3-5 mistakes you see ${audience} making with ${topic}? What do they get wrong that costs them time or money?` },
            { title: "The Foundation: Getting Started Right", guide: `What does a complete beginner need to know first? What's the minimum viable setup or knowledge to get started?` },
            { title: "The Core Process: Step by Step", guide: `Walk through your process. If you were teaching someone over coffee, what would the steps be? Include specific numbers, tools, or frameworks you use.` },
            { title: "Advanced Strategies That Separate Pros from Amateurs", guide: `What do you know that most people in this space don't? What's the insight that took you years to learn?` },
            { title: "Your Action Plan: What to Do This Week", guide: `Give the reader a concrete 7-day action plan. What should they do on day 1? Day 3? By the end of the week?` },
        ],
    },
    "lessons": {
        label: "Lessons & Insights",
        desc: "Wisdom from your experience — stories + takeaways",
        chapters: (topic, audience) => [
            { title: "How I Got Into This", guide: `What's your origin story with ${topic}? What drew you in? Keep it honest — readers connect with real stories, not polished ones.` },
            { title: "The Lesson That Changed Everything", guide: `What was your biggest breakthrough or turning point? What did you believe before that turned out to be wrong?` },
            { title: "What Nobody Tells You", guide: `What's the unfiltered truth about ${topic} that gurus and courses leave out? What do you wish someone had told you?` },
            { title: "The Framework I Use Every Day", guide: `Do you have a mental model, checklist, or decision framework? Walk through how you think about ${topic} when making real decisions.` },
            { title: `What I'd Tell ${audience} Starting Today`, guide: `If you could sit down with someone just starting out, what would you say? Be specific — not generic advice, but the actual moves you'd recommend.` },
        ],
    },
    "resource": {
        label: "Ultimate Resource Guide",
        desc: "Everything your reader needs to know in one place",
        chapters: (topic, audience) => [
            { title: `${topic}: The Complete Overview`, guide: `Give a clear, jargon-free explanation of what ${topic} is and why it matters. Assume the reader is smart but new to this.` },
            { title: "Key Concepts You Need to Understand", guide: `What are the 5-8 most important terms, ideas, or principles? Explain each one simply with a real-world example.` },
            { title: "Tools, Resources & Recommendations", guide: `What tools, apps, books, or resources do you actually use and recommend? Be specific — names, prices, why you chose them.` },
            { title: "Common Questions Answered", guide: `What questions do ${audience} ask you most often? Answer each one directly and honestly.` },
            { title: "Next Steps & Where to Go Deeper", guide: `What should the reader do after finishing this guide? Where can they learn more, practice, or connect with others?` },
        ],
    },
};

// --- Topic extraction ---
function extractTopic(expertise) {
    let t = expertise.trim();

    // Strip leading filler: "I'm a ...", "I am a ...", "I've been ..."
    t = t.replace(/^i(?:'m| am)\s+(?:a |an )?/i, "");
    t = t.replace(/^i(?:'ve| have)\s+(?:been |spent )\s*/i, "");

    // "I teach/help/coach people how to ..." → keep what follows "how to"
    const howTo = t.match(/^i\s+\w+\s+(?:people\s+)?how\s+to\s+(.+)/i);
    if (howTo) {
        t = howTo[1].trim();
    } else {
        // "I do/teach/help/run/coach/train/focus on ..."
        t = t.replace(/^i\s+(?:do|teach|help|run|coach|train|specialize|focus)\s+(?:on |in |people |with )?\s*/i, "");
        // Strip bare leading "I " but keep the verb (so "I flip cars" → "flip cars")
        t = t.replace(/^i\s+/i, "");
    }

    // "my expertise/background is ..."
    t = t.replace(/^my\s+(?:expertise|background|experience|specialty|niche)\s+(?:is\s+(?:in\s+)?|in\s+)/i, "");

    // "specializing in X" → keep X
    const specMatch = t.match(/specializ(?:ing|e)\s+in\s+(.+)/i);
    if (specMatch) t = specMatch[1].trim();

    // Remove trailing clauses after comma, semicolon, period (NOT hyphens)
    t = t.split(/[,;.]/)[0].trim();

    // Remove trailing filler: "for 10 years", "since 2015", "I've done 200+"
    t = t.replace(/\s+(?:for|since|over|and|i['']ve)\b.*$/i, "").trim();

    // Strip leading gerund fillers
    t = t.replace(/^(?:doing|running|building|making|creating|selling|buying|teaching|learning)\s+/i, "");

    // Strip possessives: "their", "your", "my"
    t = t.replace(/\b(?:their|your|my|his|her|our)\s+/gi, "");

    // Strip "who ..." clauses
    t = t.replace(/\s+who\b.*$/i, "").trim();

    // Convert verb-object phrases to cleaner noun form:
    // "flip cars" → "Car Flipping", "grow YouTube channels" → "YouTube Channel Growth"

    // Verbs where the gerund adds meaning to the topic
    const actionVerbs = {
        flip: "Flipping", trade: "Trading", sell: "Selling", buy: "Buying",
        cook: "Cooking", write: "Writing", invest: "Investing", fix: "Fixing",
    };
    // Verbs where a noun form suffix works better
    const nounVerbs = {
        grow: "Growth", manage: "Management", design: "Design", scale: "Scaling",
    };
    // Verbs where the object IS the topic — just drop the verb
    const dropVerbs = new Set([
        "start", "launch", "create", "build", "make", "learn", "master",
    ]);

    const words = t.split(/\s+/);
    if (words.length >= 2) {
        const verb = words[0].toLowerCase();
        let obj = words.slice(1).join(" ");
        // De-pluralize for cleaner titles ("cars" → "car", "businesses" → "business")
        obj = obj.replace(/nesses$/i, "ness").replace(/ies$/i, "y").replace(/([^s])s$/i, "$1");

        if (dropVerbs.has(verb)) {
            t = obj;
        } else if (actionVerbs[verb]) {
            t = obj + " " + actionVerbs[verb];
        } else if (nounVerbs[verb]) {
            t = obj + " " + nounVerbs[verb];
        }
    }

    // Title-case (respecting small words)
    const smallWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "of", "for", "to", "with"]);
    t = t.split(/\s+/).filter(Boolean).map((w, i) => {
        const lower = w.toLowerCase();
        if (i > 0 && smallWords.has(lower)) return lower;
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");

    // Fallback
    if (!t || t.length < 3) {
        t = expertise.split(/\s+/).slice(0, 4).join(" ");
        t = t.replace(/\b\w/g, c => c.toUpperCase());
    }

    return t;
}

function extractAudience(audience) {
    let a = audience.trim();

    // 1) Strip generic pronouns + "who": "someone who ...", "people who ..."
    a = a.replace(/^(?:people|those|anyone|someone|everybody|everyone|folks|individuals|a person|persons?)\s+who\s+/i, "");

    // 2) FIRST try to keep a concrete noun before "who/that/looking/wanting":
    //    "beginners who want to ..." → "Beginners"
    //    "women over 40 who ..." → "women over 40"
    //    Skip if the noun is generic (already stripped above, but catch stragglers)
    const nounBeforeWho = a.match(/^(.+?)\s+(?:who |that |looking |wanting |trying |struggling )/i);
    if (nounBeforeWho) {
        const before = nounBeforeWho[1].trim().toLowerCase();
        const generic = new Set(["someone", "anyone", "everybody", "everyone", "person", "people", "they", "them"]);
        if (!generic.has(before) && nounBeforeWho[1].length > 3) {
            a = nounBeforeWho[1].trim();
        }
    }

    // 3) Convert verb phrases into audience labels (only runs on remaining text):
    //    "obsessively listens to X" → "X Fans"
    //    "loves X" → "X Fans", "is into X" → "X Fans"
    const listenMatch = a.match(/(?:listens?\s+to|(?:is|are)\s+(?:into|obsessed\s+with)|loves?|(?:is|are)\s+(?:a\s+)?(?:huge|big)?\s*fans?\s+of)\s+(.+)/i);
    if (listenMatch) {
        let subject = listenMatch[1].trim().split(/[,;.]/)[0].trim();
        subject = subject.replace(/\s+(?:a lot|all the time|constantly|obsessively|really)$/i, "").trim();
        const words = subject.split(/\s+/);
        if (words.length <= 4 && words.length >= 1) {
            a = subject + " Fans";
        }
    }

    // 4) "wants to learn X" → "X Beginners", "wants to become a chef" → "Aspiring Chefs"
    const wantsLearn = a.match(/(?:wants?|trying|hoping)\s+to\s+learn\s+(?:about\s+)?(.+)/i);
    if (wantsLearn) {
        let skill = wantsLearn[1].trim().split(/[,;.]/)[0].trim();
        if (skill.split(/\s+/).length <= 3) a = skill + " Beginners";
    }
    const wantsBecome = a.match(/(?:wants?|trying|hoping)\s+to\s+(?:become|be)\s+(?:a |an )?(.+)/i);
    if (wantsBecome) {
        let role = wantsBecome[1].trim().split(/[,;.]/)[0].trim();
        if (role.split(/\s+/).length <= 2) {
            // Capitalize and pluralize
            role = role.charAt(0).toUpperCase() + role.slice(1);
            if (!role.endsWith("s")) role += "s";
            a = "Aspiring " + role;
        }
    }

    // 5) Take first clause (comma, semicolon, period — NOT hyphen)
    a = a.split(/[,;.]/)[0].trim();

    // 6) Cut before participial/descriptive phrases
    a = a.replace(/\s+(?:dealing|drowning|struggling|suffering|coping|worried|scared|confused|tired|sick)\s+(?:with|in|of|about)\b.*$/i, "").trim();

    // 7) Strip remaining filler adverbs
    a = a.replace(/^(?:obsessively|constantly|really|just|basically)\s+/i, "");

    // 8) Cap at 4 words for title readability
    const words = a.split(/\s+/);
    if (words.length > 4) a = words.slice(0, 4).join(" ");

    // 9) Title-case
    const smallWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "of", "for", "to", "with"]);
    a = a.split(/\s+/).filter(Boolean).map((w, i) => {
        const lower = w.toLowerCase();
        if (i > 0 && smallWords.has(lower)) return lower;
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");

    // 10) Final fallback — if still generic, use first 4 words of original
    const genericFinal = new Set(["Someone", "Anyone", "Everybody", "Everyone", "Person", "People"]);
    if (!a || a.length < 3 || genericFinal.has(a)) {
        a = audience.split(/\s+/).slice(0, 4).join(" ");
        a = a.replace(/\b\w/g, c => c.toUpperCase());
    }

    return a;
}

// --- Title formula engine ---
function generateTitles(expertise, audience, problem) {
    const topic = extractTopic(expertise);
    const reader = extractAudience(audience);

    return [
        `The ${topic} Playbook: A Practical Guide for ${reader}`,
        `${topic} Made Simple: What Every ${reader.replace(/s$/i, "")} Needs to Know`,
        `The No-BS Guide to ${topic}`,
        `${topic} Secrets: What Most ${reader} Get Wrong`,
        `Master ${topic}: From Confused to Confident`,
    ];
}

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
    ta.rows = 3;
    ta.addEventListener("input", () => {
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
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

function showOptionCards(options, onSelect) {
    clearInput();
    // Options appear as bot message cards
    let html = '<div class="option-cards">';
    options.forEach((opt, i) => {
        html += `<div class="option-card" data-index="${i}" onclick="window.__selectOption(${i})">
            <div class="option-label">${opt.label}</div>
            ${opt.desc ? `<div class="option-desc">${opt.desc}</div>` : ""}
        </div>`;
    });
    html += '</div>';
    addBotMsg(html, 0);

    window.__selectOption = (i) => {
        document.querySelectorAll(".option-card").forEach((el, j) => {
            el.classList.toggle("selected", j === i);
        });
        onSelect(options[i], i);
    };
}

// =========================================================================
// CHAT FLOW
// =========================================================================

async function startChat() {
    await addBotMsg("Hey! I'm <strong>ProductForge</strong> — I help you create professional ebooks from scratch.", 400);
    await addBotMsg("I'll ask you a few questions to understand your expertise and who you're writing for. Then I'll help you structure your ebook, develop each chapter, and generate a polished PDF.", 700);
    await addBotMsg("Let's start with the big picture. <strong>What do you know really well?</strong> What's your area of expertise — the thing people come to you for advice on?", 600);

    step = "expertise";
    showTextArea(
        "e.g. I flip cars for profit, I've done 200+ flips in 3 years\ne.g. I'm a nutritionist specializing in gut health\ne.g. I teach people how to start e-commerce businesses",
        handleExpertise,
        "That's me"
    );
}

// --- Step 1: Expertise ---
async function handleExpertise(text) {
    addUserMsg(text);
    clearInput();
    ebook.expertise = text;

    await addBotMsg(`Interesting — <strong>${text}</strong>. That's solid expertise.`, 400);
    await addBotMsg("Now, <strong>who are you writing this for?</strong> Describe your ideal reader — the specific person who needs your knowledge most.", 600);

    step = "audience";
    showTextArea(
        "e.g. Beginners who want to start flipping cars but don't know where to begin\ne.g. Women over 40 dealing with bloating and fatigue\ne.g. Side hustlers looking to quit their 9-5",
        handleAudience,
        "That's my reader"
    );
}

// --- Step 2: Audience ---
async function handleAudience(text) {
    addUserMsg(text);
    clearInput();
    ebook.audience = text;

    await addBotMsg(`Got it — you're writing for <strong>${text}</strong>.`, 300);
    await addBotMsg("One more thing: <strong>What's the #1 problem or frustration</strong> your reader has that this ebook will solve?", 500);

    step = "problem";
    showTextArea(
        "e.g. They waste money buying the wrong cars because they don't know what to look for\ne.g. They've tried every diet but nothing works for their gut issues\ne.g. They're stuck in analysis paralysis and never actually launch",
        handleProblem,
        "That's the problem"
    );
}

// --- Step 3: Problem → Suggest ebook concepts ---
async function handleProblem(text) {
    addUserMsg(text);
    clearInput();
    ebook.problem = text;

    await addBotMsg("Perfect. Now I have a clear picture. Let me think about the best approach for your ebook...", 500);
    await addBotMsg("Based on what you told me, here are <strong>3 ebook formats</strong> that would work well. Pick the one that fits your style:", 800);

    step = "structure";

    let html = '<div class="option-cards">';
    Object.entries(EBOOK_STRUCTURES).forEach(([key, struct], i) => {
        html += `<div class="option-card" data-key="${key}" onclick="window.selectStructure('${key}')">
            <div class="option-label">${struct.label}</div>
            <div class="option-desc">${struct.desc}</div>
        </div>`;
    });
    html += '</div>';

    await addBotMsg(html, 0);
    clearInput();
}

window.selectStructure = async function(key) {
    if (step !== "structure") return;
    const struct = EBOOK_STRUCTURES[key];
    if (!struct) return;

    document.querySelectorAll(".option-card").forEach(el => {
        el.classList.toggle("selected", el.dataset.key === key);
    });

    addUserMsg(struct.label);
    ebook.concept = key;

    const topic = extractTopic(ebook.expertise);
    const audience = extractAudience(ebook.audience);

    // Generate chapter outline
    const chapterTemplates = struct.chapters(topic, audience);
    ebook.chapters = chapterTemplates.map(ch => ({
        title: ch.title,
        guideQuestion: ch.guide,
        content: "",
    }));

    await addBotMsg(`Great choice — <strong>${struct.label}</strong>. Now let's pick a title.`, 400);
    await suggestTitles();
};

// --- Step 4: Title workshop ---
async function suggestTitles() {
    step = "title";

    const titles = generateTitles(ebook.expertise, ebook.audience, ebook.problem);

    let html = "Here are some title ideas based on your topic and audience. <strong>Pick one, or write your own:</strong>";
    html += '<div class="option-cards">';
    titles.forEach((t, i) => {
        html += `<div class="option-card" onclick="window.selectTitle(${i})">
            <div class="option-label">${t}</div>
        </div>`;
    });
    html += '</div>';

    await addBotMsg(html, 600);

    window.__titles = titles;
    showTextInput("Or type your own title...", handleCustomTitle);
}

window.selectTitle = async function(index) {
    if (step !== "title") return;
    const title = window.__titles[index];

    document.querySelectorAll(".option-card").forEach((el, i) => {
        el.classList.toggle("selected", i === index);
    });

    handleTitleSelected(title);
};

async function handleCustomTitle(text) {
    handleTitleSelected(text);
}

async function handleTitleSelected(title) {
    if (step !== "title") return;
    step = "title-done";

    addUserMsg(title);
    clearInput();

    // Parse title and subtitle
    const parts = title.split(/[:\u2014—]/);
    if (parts.length >= 2) {
        ebook.title = parts[0].trim();
        ebook.subtitle = parts.slice(1).join(" — ").trim();
    } else {
        ebook.title = title;
        ebook.subtitle = "";
    }

    await addBotMsg(`<strong>"${ebook.title}"</strong>${ebook.subtitle ? " — " + ebook.subtitle : ""}. Love it.`, 400);
    await showChapterOutline();
}

// --- Step 5: Chapter outline review ---
async function showChapterOutline() {
    step = "outline";

    let html = "Here's the chapter outline I've built for you. <strong>You can edit titles, reorder, or remove chapters:</strong>";
    html += '<div class="chapter-outline" id="chapter-outline">';
    ebook.chapters.forEach((ch, i) => {
        html += `<div class="outline-item" data-index="${i}">
            <span class="outline-num">${i + 1}</span>
            <input type="text" class="outline-title" value="${escapeAttr(ch.title)}"
                onchange="window.updateOutlineTitle(${i}, this.value)">
            <button class="btn-danger" onclick="window.removeOutlineChapter(${i})">x</button>
        </div>`;
    });
    html += '</div>';
    html += '<div style="margin-top:8px;font-size:0.82rem;color:var(--muted)">Don\'t worry about getting it perfect — you can always adjust.</div>';

    await addBotMsg(html, 600);

    showButtons([
        { label: "Looks good — let's write!", cls: "btn-primary", onClick: startContentDev },
        { label: "+ Add a chapter", cls: "btn-secondary btn-small", onClick: addOutlineChapter },
    ]);
}

window.updateOutlineTitle = function(index, value) {
    if (ebook.chapters[index]) ebook.chapters[index].title = value;
};

window.removeOutlineChapter = function(index) {
    ebook.chapters.splice(index, 1);
    // Re-render outline
    const el = document.querySelector(".chapter-outline");
    if (el) el.closest(".msg").remove();
    showChapterOutline();
};

async function addOutlineChapter() {
    // Sync current outline titles
    document.querySelectorAll(".outline-title").forEach((input, i) => {
        if (ebook.chapters[i]) ebook.chapters[i].title = input.value;
    });
    ebook.chapters.push({
        title: `Chapter ${ebook.chapters.length + 1}`,
        guideQuestion: "What do you want to cover in this chapter? Share your key points.",
        content: "",
    });
    const el = document.querySelector(".chapter-outline");
    if (el) el.closest(".msg").remove();
    await showChapterOutline();
}

// --- Step 6: Guided content development ---
let currentChapterIndex = 0;

async function startContentDev() {
    // Sync outline titles
    document.querySelectorAll(".outline-title").forEach((input, i) => {
        if (ebook.chapters[i]) ebook.chapters[i].title = input.value;
    });

    clearInput();
    currentChapterIndex = 0;

    await addBotMsg("Now let's fill in your chapters. I'll guide you through each one with a question to help draw out your best content.", 500);
    await addBotMsg("Write as much or as little as you want. <strong>Think of it like explaining to a friend</strong> — natural, conversational. I'll handle the formatting.", 600);

    await promptForChapter(0);
}

async function promptForChapter(index) {
    if (index >= ebook.chapters.length) {
        await finishContent();
        return;
    }

    currentChapterIndex = index;
    step = "content";
    const ch = ebook.chapters[index];

    const progress = `<div class="progress-bar"><div class="fill" style="width:${((index) / ebook.chapters.length * 100).toFixed(0)}%"></div></div>`;

    await addBotMsg(
        `${progress}<strong>Chapter ${index + 1} of ${ebook.chapters.length}: "${ch.title}"</strong><br><br>` +
        `${ch.guideQuestion}`,
        500
    );

    showTextArea(
        "Write your thoughts here... separate ideas with blank lines for paragraphs",
        (text) => handleChapterContent(index, text),
        index < ebook.chapters.length - 1 ? "Next chapter →" : "Finish writing"
    );
}

async function handleChapterContent(index, text) {
    addUserMsg(text.length > 100 ? text.substring(0, 100) + "..." : text);
    clearInput();

    ebook.chapters[index].content = text;

    const encouragements = [
        "Great stuff. That's real, specific knowledge — exactly what makes ebooks valuable.",
        "This is good. Your reader is going to highlight this section.",
        "Nice — you can tell this comes from real experience, not theory.",
        "Solid. The specificity here is what separates good ebooks from generic ones.",
        "Love the detail. This is the kind of thing people pay for.",
    ];

    await addBotMsg(encouragements[index % encouragements.length], 400);

    // Move to next chapter
    await promptForChapter(index + 1);
}

// --- Step 7: Content complete → Author + Style + Brand ---
async function finishContent() {
    step = "author";
    const filledCount = ebook.chapters.filter(ch => ch.content.trim()).length;

    await addBotMsg(
        `All ${filledCount} chapters written! Your ebook is taking shape.`,
        400,
    );
    await addBotMsg("Almost done. <strong>What name should go on the cover?</strong>", 500);

    showTextInput("Your name or pen name", handleAuthor);
}

async function handleAuthor(text) {
    addUserMsg(text);
    clearInput();
    ebook.author = text;

    await addBotMsg(`<strong>${ebook.author}</strong> — perfect.`, 300);
    await askStyle();
}

// --- Step 8: Design style ---
async function askStyle() {
    step = "style";

    const swatches = {
        "Editorial": { colors: ["#F7F4EF", "#111110", "#8A9E8C", "#A09890"], vibe: "Elegant, literary, lots of white space" },
        "Clean": { colors: ["#1a2744", "#e17055", "#ffffff", "#f5f6fa"], vibe: "Bold, professional, business-ready" },
        "Warm": { colors: ["#1a1a2e", "#F4C430", "#B4A7D6", "#e8e8e8"], vibe: "Dark & moody, premium feel" },
    };

    let html = "Pick a design style for your ebook:";
    html += '<div class="style-cards">';
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

    await addBotMsg(html, 500);
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

// --- Step 9: Branding ---
async function askBrand() {
    step = "brand";

    let html = "Last step — your branding. Add a <strong>logo</strong> (optional) and pick an <strong>accent color</strong>.";
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

// --- Step 10: Generate ---
async function confirmAndGenerate() {
    const brandInput = document.getElementById("brand-name-input");
    const accentInput = document.getElementById("accent-color-input");
    if (brandInput) ebook.brand = brandInput.value.trim();
    if (accentInput && ebook.design) ebook.design.colors.accent = accentInput.value;

    clearInput();
    step = "generating";

    // Summary
    const chCount = ebook.chapters.filter(ch => ch.content.trim()).length;
    await addBotMsg(
        `Building your ebook:<br><br>` +
        `<strong>${ebook.title}</strong>${ebook.subtitle ? "<br><em>" + ebook.subtitle + "</em>" : ""}<br>` +
        `By ${ebook.author}<br>` +
        `${chCount} chapters &middot; ${ebook.design?.layout || "editorial"} style` +
        (ebook.logoFilename ? `<br>Logo: ${ebook.logoFilename}` : ""),
        400,
    );

    const msgEl = await addBotMsg(
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

        await addBotMsg("Want to create another ebook? Just refresh the page. Your content ideas are only going to get better from here.", 700);
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

// --- Build PDF config ---
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

// --- Utility ---
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}
