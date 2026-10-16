/** Only the whitelist form makes requests. The product demo remains local. */
export function initWhitelist(
  root = document,
  send = (...args) => fetch(...args),
) {
  const form = root.querySelector("#whitelist-form");
  if (!form) return;
  const copy = JSON.parse(root.querySelector("#whitelist-copy").textContent);
  const email = root.querySelector("#whitelist-email");
  const consent = root.querySelector("#whitelist-consent");
  const website = root.querySelector("#whitelist-website");
  const phone = root.querySelector("#whitelist-phone");
  const phonePrefix = root.querySelector("#whitelist-phone-prefix");
  const phonePrefixDisplay = root.querySelector("#whitelist-phone-prefix-display");
  const selectedPrefix = () => phonePrefix.querySelector("option:checked");
  function updatePhonePrefix() {
    const option = selectedPrefix();
    phonePrefixDisplay.textContent = `${option.dataset.flag} +${option.dataset.dialCode}`;
    phone.removeAttribute("aria-invalid");
  }
  phonePrefix.addEventListener("change", updatePhonePrefix);
  updatePhonePrefix();
  const country = root.querySelector("#whitelist-country");
  const countryOther = root.querySelector("#whitelist-country-other");
  const city = root.querySelector("#whitelist-city");
  const cityOther = root.querySelector("#whitelist-city-other");
  const cities = JSON.parse(root.querySelector("#whitelist-locations").textContent).cities;
  function option(value, text) {
    const element = root.createElement("option");
    element.value = value;
    element.textContent = text;
    return element;
  }
  function updateCityInput() {
    const manual = !!country.value && (city.hidden || city.value === "__other");
    cityOther.hidden = !manual;
    cityOther.disabled = !manual;
    if (!manual) cityOther.value = "";
  }
  function updateCountry() {
    const code = country.value || "";
    countryOther.hidden = code !== "__other";
    countryOther.disabled = code !== "__other";
    if (code !== "__other") countryOther.value = "";
    const names = cities[code] || [];
    const placeholder = option("", code ? copy.chooseCity : copy.chooseCountryFirst);
    placeholder.selected = true;
    city.replaceChildren(placeholder);
    for (const name of [...names].sort((a, b) => a.localeCompare(b, root.documentElement.lang)))
      city.append(option(name, name));
    if (code && names.length) city.append(option("__other", copy.otherCity));
    city.disabled = !code || !names.length;
    city.hidden = !!code && !names.length;
    cityOther.value = "";
    city.removeAttribute("aria-invalid");
    cityOther.removeAttribute("aria-invalid");
    updateCityInput();
  }
  const details = [
    ["name", 120],
    ["country", 100],
    ["city", 120],
    ["phone", 40],
  ].map(([key, max]) => ({
    key,
    max,
    input: root.querySelector(`#whitelist-${key}`),
  }));
  const status = root.querySelector("#whitelist-status");
  const success = root.querySelector("#whitelist-success");
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector("span");
  let submitting = false;
  updateCountry();
  button.disabled = false;
  function report(text, field) {
    status.textContent = text;
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus({ preventScroll: true });
    }
  }
  email.addEventListener("input", () => {
    email.removeAttribute("aria-invalid");
    status.textContent = "";
  });
  for (const { input } of details)
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      status.textContent = "";
    });
  for (const input of [countryOther, cityOther])
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      status.textContent = "";
    });
  country.addEventListener("change", () => {
    updateCountry();
    country.removeAttribute("aria-invalid");
    status.textContent = "";
  });
  city.addEventListener("change", () => {
    updateCityInput();
    city.removeAttribute("aria-invalid");
    status.textContent = "";
  });
  consent.addEventListener("change", () => {
    consent.removeAttribute("aria-invalid");
    status.textContent = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const value = email.value.trim();
    if (
      !value ||
      value.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
    )
      return report(copy.invalid, email);
    if (!consent.checked) return report(copy.consentError, consent);
    const profile = {};
    for (const { key, max, input: field } of details) {
      const input = key === "country" && !countryOther.disabled ? countryOther
        : key === "city" && !cityOther.disabled ? cityOther : field;
      const raw = key === "country" && countryOther.disabled
        ? country.querySelector("option:checked")?.dataset.countryName || ""
        : key === "city" && !country.value ? "" : input.value;
      const value = raw.trim();
      if (value.length > max || /[\u0000-\u001f\u007f]/u.test(value))
        return report(copy.detailsError, input);
      profile[key] = value || null;
    }
    if (profile.phone) {
      const digits = profile.phone.replace(/\D/g, "");
      const dialCode = selectedPrefix().dataset.dialCode;
      if (!/^[\d\s().-]+$/u.test(profile.phone) || digits.length < 4 ||
          dialCode.length + digits.length > 15)
        return report(copy.phoneError, phone);
      profile.phone = `+${dialCode} ${digits}`;
    }
    submitting = true;
    status.textContent = "";
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    button.classList.add("is-loading");
    label.textContent = copy.submitting;
    try {
      const response = await send(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: value,
          ...profile,
          consent: true,
          language: root.documentElement.lang,
          website: website.value || "",
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        report(
          response.status === 503
            ? copy.unavailable
            : response.status === 429
              ? copy.limited
              : copy.error,
        );
        return;
      }
      // Show success only after the backend confirms persistence (or an existing signup).
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      email.value = "";
      for (const { input } of details)
        if (input.tagName !== "SELECT") input.value = "";
      country.options[0].selected = true;
      updateCountry();
      // Recenter after the tall form collapses into the shorter confirmation.
      const view = root.defaultView;
      const centerConfirmation = () => success.closest(".whitelist-card").scrollIntoView?.({
        block: "center",
        inline: "nearest",
        behavior: view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "instant" : "smooth",
      });
      if (view?.requestAnimationFrame) view.requestAnimationFrame(centerConfirmation);
      else centerConfirmation();
    } catch {
      report(copy.error);
    } finally {
      submitting = false;
      button.disabled = false;
      button.classList.remove("is-loading");
      label.textContent = copy.submit;
      form.removeAttribute("aria-busy");
    }
  });
}
