Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmdPath = fso.BuildPath(scriptDir, "Launch-Novel-Tools.cmd")

shell.Run Chr(34) & cmdPath & Chr(34), 0, False
