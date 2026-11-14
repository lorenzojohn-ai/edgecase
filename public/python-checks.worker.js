const runtimeUrl = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
self.onmessage = async ({ data }) => {
  try {
    importScripts(runtimeUrl + "pyodide.js");
    const python = await loadPyodide({ indexURL: runtimeUrl });
    self.postMessage({ ready: true });
    const globals = python.toPy({ source: data.code, function_name: data.name, inputs: JSON.stringify(data.tests) });
    try {
      const output = python.runPython(`
import json
def equal_json(actual, expected):
    if type(actual) in (int, float) and type(expected) in (int, float):
        return actual == expected
    if type(actual) is not type(expected):
        return False
    if isinstance(actual, list):
        return len(actual) == len(expected) and all(equal_json(a, b) for a, b in zip(actual, expected))
    if isinstance(actual, dict):
        return actual.keys() == expected.keys() and all(equal_json(actual[k], expected[k]) for k in actual)
    return actual == expected

results = []
for case in json.loads(inputs):
    result = {"expected": case["expected"]}
    try:
        namespace = {}
        exec(source, namespace)
        actual = namespace[function_name](*case["args"])
        encoded = json.dumps(actual, allow_nan=False, sort_keys=True)
        result["actual"] = json.loads(encoded)
        result["passed"] = equal_json(result["actual"], case["expected"])
    except Exception as error:
        result.update(passed=False, error=f"{type(error).__name__}: {error}"[:800])
    results.append(result)
json.dumps(results)
`, { globals });
      self.postMessage({ results: JSON.parse(output) });
    } finally {
      globals.destroy();
    }
  } catch (error) {
    self.postMessage({ error: "Python runtime error: " + error.message });
  }
};
