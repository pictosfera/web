@echo off
REM Gestor de Subidas Web - Pictosfera
REM Doble clic en este archivo para abrir la aplicacion.
REM No cierra ninguna ventana de Windows visible; solo abre la app.

start /min "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0App\GestorSubidasWeb.ps1"
exit
