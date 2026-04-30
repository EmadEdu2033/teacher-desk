; Teacher Desk — NSIS installer script
; Built with native makensis (no wine required).
; Run from teacher-desk/ : makensis -DSOURCE_DIR=dist/win-unpacked -DOUTPUT_FILE=dist/TeacherDeskSetup.exe build/installer.nsi

!include "MUI2.nsh"
!include "FileFunc.nsh"

!ifndef SOURCE_DIR
  !define SOURCE_DIR "..\dist\win-unpacked"
!endif
!ifndef OUTPUT_FILE
  !define OUTPUT_FILE "..\dist\TeacherDeskSetup.exe"
!endif

!define APP_NAME       "Teacher Desk"
; APP_VERSION may be overridden from the makensis command line via -DAPP_VERSION=...
!ifndef APP_VERSION
  !define APP_VERSION  "1.0.0"
!endif
!define APP_PUBLISHER  "Teacher Desk"
!define APP_EXE        "Teacher Desk.exe"
!define APP_REGKEY     "Software\TeacherDesk"
!define UNINST_REGKEY  "Software\Microsoft\Windows\CurrentVersion\Uninstall\TeacherDesk"

Name "${APP_NAME}"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\Teacher Desk"
InstallDirRegKey HKCU "${APP_REGKEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
ShowInstDetails show
ShowUnInstDetails show

; Installer + uninstaller .exe icon (the "green chalkboard with blue frame")
Icon   "icon.ico"
UninstallIcon "icon.ico"
!define MUI_ICON   "icon.ico"
!define MUI_UNICON "icon.ico"

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName"     "${APP_NAME}"
VIAddVersionKey "CompanyName"     "${APP_PUBLISHER}"
VIAddVersionKey "FileDescription" "Teacher Desk Installer"
VIAddVersionKey "FileVersion"     "${APP_VERSION}"
VIAddVersionKey "ProductVersion"  "${APP_VERSION}"
VIAddVersionKey "LegalCopyright"  "Copyright (C) 2026 ${APP_PUBLISHER}"

; --- MUI2 wizard pages ---
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Teacher Desk now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Arabic"

; --- Install ---
Section "Teacher Desk (required)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Embed the entire unpacked Electron app folder.
  File /r "${SOURCE_DIR}/*.*"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Teacher Desk"
  CreateShortCut "$SMPROGRAMS\Teacher Desk\Teacher Desk.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortCut "$SMPROGRAMS\Teacher Desk\Uninstall Teacher Desk.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortCut "$DESKTOP\Teacher Desk.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  ; Registry: install dir + Add/Remove Programs entry
  WriteRegStr HKCU "${APP_REGKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${APP_REGKEY}" "Version"    "${APP_VERSION}"

  WriteRegStr   HKCU "${UNINST_REGKEY}" "DisplayName"     "${APP_NAME}"
  WriteRegStr   HKCU "${UNINST_REGKEY}" "DisplayVersion"  "${APP_VERSION}"
  WriteRegStr   HKCU "${UNINST_REGKEY}" "Publisher"       "${APP_PUBLISHER}"
  WriteRegStr   HKCU "${UNINST_REGKEY}" "DisplayIcon"     "$INSTDIR\${APP_EXE}"
  WriteRegStr   HKCU "${UNINST_REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${UNINST_REGKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKCU "${UNINST_REGKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINST_REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_REGKEY}" "NoRepair" 1

  ; Estimated size in KB
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNINST_REGKEY}" "EstimatedSize" "$0"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; --- Uninstall ---
Section "Uninstall"
  ; Stop a running instance silently
  ExecWait 'taskkill /F /IM "${APP_EXE}"'

  Delete "$DESKTOP\Teacher Desk.lnk"
  Delete "$SMPROGRAMS\Teacher Desk\Teacher Desk.lnk"
  Delete "$SMPROGRAMS\Teacher Desk\Uninstall Teacher Desk.lnk"
  RMDir  "$SMPROGRAMS\Teacher Desk"

  ; Remove the install folder (keeps user data in %APPDATA%\Teacher Desk).
  RMDir /r "$INSTDIR"

  DeleteRegKey HKCU "${UNINST_REGKEY}"
  DeleteRegKey HKCU "${APP_REGKEY}"
SectionEnd
