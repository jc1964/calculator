const keypad = document.querySelector("#keypad");
const screen = document.querySelector("#screen");
const expression = document.querySelector("#expression");
const status = document.querySelector("#status");
const statusText = document.querySelector("#status-text");

const operationSymbols = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
};

let currentInput = "0";
let storedValue = null;
let pendingOperation = null;
let expressionText = "Ready for a calculation";
let resetEntry = false;
let busy = false;

function render() {
  screen.textContent = currentInput;
  expression.textContent = expressionText;
}

function setStatus(message, state = "ready") {
  status.dataset.state = state;
  statusText.textContent = message;
}

function setBusy(nextBusy) {
  busy = nextBusy;
  keypad.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(value);
}

function enterDigit(digit) {
  if (resetEntry) {
    currentInput = digit;
    resetEntry = false;
  } else if (currentInput === "0") {
    currentInput = digit;
  } else if (currentInput.replace(/[-.]/g, "").length < 14) {
    currentInput += digit;
  }
  setStatus("Ready");
  render();
}

function enterDecimal() {
  if (resetEntry) {
    currentInput = "0.";
    resetEntry = false;
  } else if (!currentInput.includes(".")) {
    currentInput += ".";
  }
  render();
}

function clearAll() {
  currentInput = "0";
  storedValue = null;
  pendingOperation = null;
  expressionText = "Ready for a calculation";
  resetEntry = false;
  setStatus("Ready");
  render();
}

function deleteDigit() {
  if (resetEntry) return;
  currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
  if (currentInput === "-") currentInput = "0";
  render();
}

function changeSign() {
  if (Number(currentInput) === 0) return;
  currentInput = currentInput.startsWith("-") ? currentInput.slice(1) : `-${currentInput}`;
  resetEntry = false;
  render();
}

async function requestCalculation(a, b, operation) {
  setBusy(true);
  setStatus("Calculating", "busy");
  try {
    const response = await fetch("/api/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b, operation }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = Array.isArray(payload.detail)
        ? "Check the entered values."
        : payload.detail || "Calculation failed.";
      throw new Error(message);
    }
    setStatus("Done");
    return payload.result;
  } catch (error) {
    setStatus(error.message || "Could not reach the calculator.", "error");
    return null;
  } finally {
    setBusy(false);
  }
}

async function chooseOperation(operation) {
  if (pendingOperation && !resetEntry) {
    const result = await requestCalculation(
      storedValue,
      Number(currentInput),
      pendingOperation,
    );
    if (result === null) return;
    storedValue = result;
    currentInput = String(result);
  } else if (storedValue === null) {
    storedValue = Number(currentInput);
  }

  pendingOperation = operation;
  expressionText = `${formatNumber(storedValue)} ${operationSymbols[operation]}`;
  resetEntry = true;
  render();
}

async function evaluate() {
  if (!pendingOperation || storedValue === null) return;
  const left = storedValue;
  const right = Number(currentInput);
  const operation = pendingOperation;
  const result = await requestCalculation(left, right, operation);
  if (result === null) return;

  expressionText = `${formatNumber(left)} ${operationSymbols[operation]} ${formatNumber(right)} =`;
  currentInput = String(result);
  storedValue = null;
  pendingOperation = null;
  resetEntry = true;
  render();
}

function handleAction(action) {
  if (action === "clear") clearAll();
  if (action === "backspace") deleteDigit();
  if (action === "sign") changeSign();
  if (action === "decimal") enterDecimal();
  if (action === "equals") evaluate();
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || busy) return;

  if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
  if (button.dataset.operation) chooseOperation(button.dataset.operation);
  if (button.dataset.action) handleAction(button.dataset.action);
});

document.addEventListener("keydown", (event) => {
  if (busy || event.ctrlKey || event.metaKey || event.altKey) return;

  if (/^\d$/.test(event.key)) enterDigit(event.key);
  else if (event.key === ".") enterDecimal();
  else if (event.key === "Backspace") deleteDigit();
  else if (event.key === "Escape") clearAll();
  else if (event.key === "Enter" || event.key === "=") evaluate();
  else if (event.key === "+") chooseOperation("add");
  else if (event.key === "-") chooseOperation("subtract");
  else if (event.key === "*") chooseOperation("multiply");
  else if (event.key === "/") {
    event.preventDefault();
    chooseOperation("divide");
  }
});

render();