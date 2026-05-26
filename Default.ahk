; AutoHotkey script
; Ctrl+Shift+4 → types command and presses Enter
; Ctrl+1       → types email, Tab, then password

^+4::  ; Hotkey: Ctrl+Shift+4
    Send, claude --dangerously-skip-permissions
    Send, {Enter}
return

^+1::   ; Hotkey: Ctrl+1
    Send, siddhant.pandagle1998@gmail.com
    Send, {Tab}
    Send, @Aditya786
    Send, {Enter}
return

^+2::   ; Hotkey: Ctrl+1
    Send, admin@example.com
    Send, {Tab}
    Send, Admin@123
    Send, {Enter}
return

^SPACE::
Winset, Alwaysontop, , A
return
