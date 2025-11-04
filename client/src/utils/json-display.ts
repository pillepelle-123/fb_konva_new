/**
 * Opens a new browser window with a plain white page showing formatted JSON
 */
export function displayJSONInNewWindow(title: string, jsonContent: string): void {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('Bitte erlauben Sie Pop-ups für diese Seite, um das JSON anzuzeigen.');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: white;
      font-family: 'Courier New', monospace;
      padding: 20px;
      overflow-x: auto;
    }
    pre {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 12px;
      line-height: 1.5;
    }
    h1 {
      margin-bottom: 16px;
      color: #333;
      font-size: 18px;
      font-weight: bold;
    }
    .info {
      margin-bottom: 16px;
      padding: 12px;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      border-radius: 4px;
      font-size: 14px;
      color: #1565c0;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="info">
    Sie können den gesamten JSON-Inhalt markieren und kopieren (Strg+A, dann Strg+C).
  </div>
  <pre id="json-content">${jsonContent}</pre>
  <script>
    // Select all text on load for easy copying
    window.onload = function() {
      const pre = document.getElementById('json-content');
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    };
  </script>
</body>
</html>`;

  newWindow.document.write(html);
  newWindow.document.close();
}

