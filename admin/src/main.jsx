import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./admin.css";
import App from "./App.jsx";

const roots = new WeakMap();
let navigateFn = null;

function mount(element) {
  if (!element) return;
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  root.render(
    <StrictMode>
      <App onRegisterNavigate={(fn) => { navigateFn = fn; }} />
    </StrictMode>,
  );
}

window.MoobleAdmin = {
  mount: (element) => mount(element),
  navigate: (view) => navigateFn?.(view),
  unmount: (element) => {
    const root = roots.get(element);
    if (root) {
      root.unmount();
      roots.delete(element);
      navigateFn = null;
    }
  },
};
