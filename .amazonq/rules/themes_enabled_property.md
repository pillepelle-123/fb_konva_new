# Theme Enabled Property Rule

In themes.json, when the "enabled" property is set to false for background, border, ruledLines, or backgroundPattern settings, the entire element is not shown and all other properties within that sub-element are ignored.

## Implementation Details:

### Border Elements
- When `"border": {"enabled": false, ...}` → No border is displayed
- Implemented in: textbox.tsx checks `element.border?.enabled !== false`
- Tool settings: Checkbox controls enabled state

### Background Elements  
- When `"background": {"enabled": false, ...}` → No background is displayed
- Implemented in: textbox.tsx checks `element.background?.enabled === false`
- Tool settings: Checkbox controls enabled state

### Ruled Lines
- When `"ruledLines": {"enabled": false, ...}` → No ruled lines are displayed
- Implemented in: textbox.tsx checks `element.ruledLines?.enabled === false`
- Tool settings: Checkbox controls enabled state

### Background Patterns (Page Level)
- When `"backgroundPattern": {"enabled": false, ...}` → No pattern is displayed
- Implemented in: general-settings.tsx uses enabled property to set background type
- Canvas rendering: Only renders pattern when background.type === 'pattern'

The "enabled": false setting takes precedence over all other properties in the same sub-element.