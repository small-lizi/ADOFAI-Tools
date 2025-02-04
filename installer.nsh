!macro customInstall
  ; 保存tools目录
  Rename "$INSTDIR\tools" "$TEMP\tools_backup"
  
  ; 安装新文件
  
  ; 还原tools目录
  CreateDirectory "$INSTDIR\tools"
  CopyFiles /SILENT "$TEMP\tools_backup\*.*" "$INSTDIR\tools"
  RMDir /r "$TEMP\tools_backup"
!macroend 