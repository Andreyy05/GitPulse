Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\CODING\GitPulse\dist-electron\win-unpacked"
WshShell.Run "cmd /c ""set ELECTRON_RUN_AS_NODE=&& start """" GitPulse.exe""", 0, False

