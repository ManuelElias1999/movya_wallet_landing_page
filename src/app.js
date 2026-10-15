import { parseDemoMessage } from "./demo.js";
import { initWhitelist } from "./whitelist.js";
import { initMotion } from "./motion.js";

initWhitelist();
initMotion();

const nav = document.querySelector("#main-nav");
const menu = document.querySelector(".menu-toggle");
function closeMenu() {
  nav.classList.remove("is-open");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", menu.dataset.openLabel);
}
menu.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") !== "true";
  nav.classList.toggle("is-open", expanded);
  menu.setAttribute("aria-expanded", String(expanded));
  menu.setAttribute(
    "aria-label",
    expanded ? menu.dataset.closeLabel : menu.dataset.openLabel,
  );
});
nav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".site-header")) closeMenu();
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 1000) closeMenu();
});

const copy = JSON.parse(document.querySelector("#demo-copy").textContent);
const stream = document.querySelector("#chat-stream");
const form = document.querySelector("#demo-form");
const input = document.querySelector("#demo-input");
const suggestions = document.querySelector("#demo-suggestions");
const initialStream = stream.innerHTML;
let pending = null;
let messages = 0;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function scrollToLatest() {
  if (typeof stream.scrollTo === "function")
    stream.scrollTo({
      top: stream.scrollHeight,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  else stream.scrollTop = stream.scrollHeight;
}
function bubble(text, role = "assistant") {
  const message = el("div", `chat-message ${role}`);
  message.append(
    el("span", "message-name", role === "user" ? copy.you : "Movya"),
  );
  message.append(el("div", "message-bubble", text));
  stream.append(message);
  scrollToLatest();
  return message;
}
function resetDemo(focus = true) {
  stream.innerHTML = initialStream;
  input.value = "";
  suggestions.hidden = false;
  suggestions.style.removeProperty("display");
  pending = null;
  messages = 0;
  stream.scrollTop = 0;
  if (focus) input.focus({ preventScroll: true });
}
function showReview(payment) {
  pending = payment;
  const message = el("div", "chat-message assistant");
  message.append(el("span", "message-name", "Movya"));
  const review = el("div", "demo-review");
  review.append(el("h4", "", copy.review));
  const details = el("dl");
  [
    [copy.amount, `${payment.amount} ${payment.token}`],
    [copy.to, payment.recipient],
    [copy.network, copy.networkValue],
  ].forEach(([a, b]) => {
    const row = el("div");
    row.append(el("dt", "", a), el("dd", "", b));
    details.append(row);
  });
  review.append(details);
  const actions = el("div", "review-actions");
  const cancel = el("button", "demo-cancel", copy.cancel);
  const confirm = el("button", "demo-confirm", copy.confirm);
  cancel.type = confirm.type = "button";
  actions.append(cancel, confirm);
  review.append(actions, el("p", "review-caption", copy.ready));
  message.append(review);
  stream.append(message);
  function resolve(confirmed) {
    if (!pending) return;
    pending = null;
    cancel.disabled = confirm.disabled = true;
    if (confirmed) {
      const success = el("div", "demo-success chat-message");
      // This is fixed SVG markup; user messages always use textContent.
      success.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
      success.append(
        el("strong", "", copy.success),
        el("p", "", copy.successBody),
        el("small", "", copy.completed),
      );
      stream.append(success);
    } else bubble(copy.cancelBody);
    input.focus({ preventScroll: true });
    scrollToLatest();
  }
  cancel.addEventListener("click", () => resolve(false));
  confirm.addEventListener("click", () => resolve(true));
  scrollToLatest();
  // Bring the two available decisions into keyboard focus after submitting.
  confirm.focus({ preventScroll: true });
}
function sendMessage(value) {
  const text = value.trim();
  if (!text) return;
  if (pending) {
    bubble(copy.pending);
    input.value = "";
    return;
  }
  // Bound the conversation DOM while preserving a predictable reset control.
  if (messages >= 16) resetDemo(false);
  messages++;
  suggestions.hidden = true;
  suggestions.style.display = "none";
  bubble(text, "user");
  input.value = "";
  const result = parseDemoMessage(text);
  if (result.type === "payment") showReview(result);
  else bubble(copy[result.type]);
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});
suggestions
  .querySelectorAll("button")
  .forEach((button) =>
    button.addEventListener("click", () =>
      sendMessage(copy.suggestions[Number(button.dataset.suggestion)]),
    ),
  );
document
  .querySelector("#reset-demo")
  .addEventListener("click", () => resetDemo());
