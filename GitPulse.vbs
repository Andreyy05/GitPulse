Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\CODING\GitPulse"
WshShell.Run "node scripts/run.cjs", 0, False
