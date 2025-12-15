export const $ = (selector, scope = document) => {
  return scope.querySelector(selector);
};

export const $$ = (selector, scope = document) => {
  return [...scope.querySelectorAll(selector)];
};

export function el(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const key in attributes) {
    const value = attributes[key];

    if (key === "class") {
      element.className = value;
      continue;
    }

    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.substring(2), value);
      continue;
    }

    if (value !== false && value != null) {
      element.setAttribute(key, String(value));
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null) continue;
    element.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child
    );
  }

  return element;
}
