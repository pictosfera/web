# Gestor de Subidas Web — Pictosfera
# ------------------------------------------------------------------
# Aplicación de escritorio sencilla (PowerShell + ventana gráfica de
# Windows) que detecta cambios en la carpeta del proyecto web y los
# sube a GitHub (GitHub Pages) con un par de clics.
#
# No requiere instalar Node, Python ni ningún otro programa aparte
# de "Git para Windows" (necesario porque es quien realmente habla
# con GitHub). Si no lo tienes, la propia app te avisa y te lleva a
# la página de descarga.
#
# Las credenciales se guardan cifradas en este PC (con el sistema de
# cifrado propio de Windows, DPAPI), atadas a tu usuario de Windows.
# Nunca se escriben en texto plano en ningún archivo del proyecto.
# ------------------------------------------------------------------

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
# Configuración: dónde se guarda y cómo se cifra
# ------------------------------------------------------------------

$script:CarpetaConfig = Join-Path $env:APPDATA 'GestorSubidasWeb'
$script:ArchivoConfig = Join-Path $script:CarpetaConfig 'config.xml'
$script:Config = $null
$script:RamaActual = 'main'

function Get-CarpetaProyectoPorDefecto {
    return 'C:\Users\cogni\Desktop\NO BORRAR WEB PICTOSFERA'
}

function Load-Config {
    if (Test-Path $script:ArchivoConfig) {
        try {
            return Import-Clixml -Path $script:ArchivoConfig
        } catch {
            return $null
        }
    }
    return $null
}

function Save-Config {
    param(
        [string]$Usuario,
        [string]$Token,
        [string]$RepoUrl,
        [string]$Carpeta,
        [string]$Email
    )
    if (-not (Test-Path $script:CarpetaConfig)) {
        New-Item -ItemType Directory -Path $script:CarpetaConfig -Force | Out-Null
    }
    $tokenCifrado = $null
    if ($Token) {
        $tokenCifrado = ConvertTo-SecureString -String $Token -AsPlainText -Force | ConvertFrom-SecureString
    }
    $config = [PSCustomObject]@{
        Usuario      = $Usuario
        TokenCifrado = $tokenCifrado
        RepoUrl      = $RepoUrl
        Carpeta      = $Carpeta
        Email        = $Email
    }
    $config | Export-Clixml -Path $script:ArchivoConfig
    $script:Config = $config
}

function Get-TokenDescifrado {
    if (-not $script:Config -or -not $script:Config.TokenCifrado) { return '' }
    try {
        $secure = ConvertTo-SecureString -String $script:Config.TokenCifrado
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    } catch {
        return ''
    }
}

function Get-CabeceraAutenticacion {
    $token = Get-TokenDescifrado
    if (-not $token -or -not $script:Config.Usuario) { return $null }
    $par = "{0}:{1}" -f $script:Config.Usuario, $token
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($par)
    $b64 = [Convert]::ToBase64String($bytes)
    return "AUTHORIZATION: Basic $b64"
}

# ------------------------------------------------------------------
# Utilidades para ejecutar git y capturar su salida
# ------------------------------------------------------------------

function Test-GitDisponible {
    try {
        $null = & git --version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Invoke-Git {
    # Ejecuta git en la carpeta del proyecto y devuelve [salida, codigo]
    param(
        [string[]]$Argumentos,
        [switch]$ConAuth
    )
    $carpeta = $script:Config.Carpeta
    $argsFinales = @('-C', $carpeta)
    if ($ConAuth) {
        $cabecera = Get-CabeceraAutenticacion
        if ($cabecera) {
            $argsFinales += @('-c', "http.extraHeader=$cabecera")
        }
    }
    $argsFinales += $Argumentos
    $salida = & git @argsFinales 2>&1
    return @{ Salida = ($salida -join "`n"); Codigo = $LASTEXITCODE }
}

function Get-NombreRamaRemota {
    param([string]$RepoUrl)
    $cabecera = Get-CabeceraAutenticacion
    $argsBase = @()
    if ($cabecera) { $argsBase += @('-c', "http.extraHeader=$cabecera") }
    $argsBase += @('ls-remote', '--symref', $RepoUrl, 'HEAD')
    $salida = & git @argsBase 2>&1
    if ($LASTEXITCODE -eq 0) {
        foreach ($linea in $salida) {
            if ($linea -match 'ref:\s+refs/heads/(\S+)\s+HEAD') {
                return $Matches[1]
            }
        }
    }
    return $null
}

# ------------------------------------------------------------------
# Conectar / preparar el repositorio local la primera vez
# ------------------------------------------------------------------

function Initialize-Repositorio {
    param([string]$Carpeta, [string]$RepoUrl)

    if (-not (Test-Path $Carpeta)) {
        New-Item -ItemType Directory -Path $Carpeta -Force | Out-Null
    }

    $tieneGit = Test-Path (Join-Path $Carpeta '.git')
    $ramaRemota = Get-NombreRamaRemota -RepoUrl $RepoUrl
    $repoRemotoTieneHistoria = [bool]$ramaRemota
    if (-not $ramaRemota) { $ramaRemota = 'main' }
    $script:RamaActual = $ramaRemota

    if (-not $tieneGit) {
        & git -C $Carpeta init -b $ramaRemota 2>&1 | Out-Null
    }

    $remotos = & git -C $Carpeta remote 2>&1
    if ($remotos -contains 'origin') {
        & git -C $Carpeta remote set-url origin $RepoUrl 2>&1 | Out-Null
    } else {
        & git -C $Carpeta remote add origin $RepoUrl 2>&1 | Out-Null
    }

    $usuario = $script:Config.Usuario
    $email = $script:Config.Email
    if (-not $email) { $email = "$usuario@users.noreply.github.com" }
    & git -C $Carpeta config --local user.name $usuario 2>&1 | Out-Null
    & git -C $Carpeta config --local user.email $email 2>&1 | Out-Null

    $gitignore = Join-Path $Carpeta '.gitignore'
    if (-not (Test-Path $gitignore)) {
        @('node_modules/', '.DS_Store', 'Thumbs.db', '*.log') | Set-Content -Path $gitignore -Encoding UTF8
    }

    return @{ RamaRemota = $ramaRemota; TieneHistoriaRemota = $repoRemotoTieneHistoria }
}

# ------------------------------------------------------------------
# Detectar cambios
# ------------------------------------------------------------------

function Get-CambiosPendientes {
    $res = Invoke-Git -Argumentos @('status', '--porcelain=v1')
    if ($res.Codigo -ne 0) {
        return @{ Error = $res.Salida; Cambios = @() }
    }
    $cambios = @()
    foreach ($linea in ($res.Salida -split "`n")) {
        if (-not $linea) { continue }
        $codigo = $linea.Substring(0, 2)
        $archivo = $linea.Substring(3)
        $etiqueta = switch -Regex ($codigo.Trim()) {
            '^\?\?' { 'Nuevo'; break }
            '^A'    { 'Añadido'; break }
            '^M'    { 'Modificado'; break }
            '^D'    { 'Eliminado'; break }
            '^R'    { 'Renombrado'; break }
            default { 'Cambiado' }
        }
        $cambios += "[$etiqueta]  $archivo"
    }
    return @{ Error = $null; Cambios = $cambios }
}

# ------------------------------------------------------------------
# Subir cambios (add + commit + push), sin guardar el token en disco
# salvo en el config cifrado
# ------------------------------------------------------------------

function Publish-Cambios {
    param([string]$Mensaje)

    $add = Invoke-Git -Argumentos @('add', '-A')
    if ($add.Codigo -ne 0) { return @{ Ok = $false; Mensaje = "Error al preparar archivos:`n$($add.Salida)" } }

    $commit = Invoke-Git -Argumentos @('commit', '-m', $Mensaje)
    if ($commit.Codigo -ne 0) {
        return @{ Ok = $false; Mensaje = "Error al hacer commit:`n$($commit.Salida)" }
    }

    $push = Invoke-Git -Argumentos @('push', '-u', 'origin', $script:RamaActual) -ConAuth
    if ($push.Codigo -ne 0) {
        $detalle = $push.Salida
        if ($detalle -match 'Authentication failed|403|401') {
            return @{ Ok = $false; Mensaje = "GitHub rechazó el usuario o el token. Revisa la Configuración.`n`nDetalle técnico:`n$detalle"; ErrorAuth = $true }
        }
        if ($detalle -match 'fetch first|non-fast-forward|rejected') {
            return @{ Ok = $false; Mensaje = "El repositorio de GitHub tiene cambios que no tienes en esta carpeta (alguien o algo subió contenido antes). No se ha forzado nada para no perder información.`n`nDetalle técnico:`n$detalle"; ErrorHistoria = $true }
        }
        return @{ Ok = $false; Mensaje = "Error al subir los cambios:`n$detalle" }
    }

    return @{ Ok = $true; Mensaje = 'Cambios subidos correctamente a GitHub.' }
}

function Publish-CambiosForzado {
    $push = Invoke-Git -Argumentos @('push', '-u', 'origin', $script:RamaActual, '--force') -ConAuth
    if ($push.Codigo -ne 0) {
        return @{ Ok = $false; Mensaje = "Error al forzar la subida:`n$($push.Salida)" }
    }
    return @{ Ok = $true; Mensaje = 'Cambios subidos (forzado) correctamente a GitHub.' }
}

# ------------------------------------------------------------------
# Ventana de Configuración
# ------------------------------------------------------------------

function Show-VentanaConfiguracion {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Configuración — Gestor de Subidas Web'
    $form.Size = New-Object System.Drawing.Size(520, 430)
    $form.StartPosition = 'CenterParent'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $y = 15
    $alto = 22
    $salto = 50

    $lblUser = New-Object System.Windows.Forms.Label
    $lblUser.Text = 'Usuario de GitHub:'
    $lblUser.Location = New-Object System.Drawing.Point(15, $y)
    $lblUser.Size = New-Object System.Drawing.Size(200, $alto)
    $form.Controls.Add($lblUser)
    $txtUser = New-Object System.Windows.Forms.TextBox
    $txtUser.Location = New-Object System.Drawing.Point(220, $y)
    $txtUser.Size = New-Object System.Drawing.Size(270, $alto)
    if ($script:Config) { $txtUser.Text = $script:Config.Usuario }
    $form.Controls.Add($txtUser)
    $y += $salto

    $lblToken = New-Object System.Windows.Forms.Label
    $lblToken.Text = 'Token de acceso (PAT):'
    $lblToken.Location = New-Object System.Drawing.Point(15, $y)
    $lblToken.Size = New-Object System.Drawing.Size(200, $alto)
    $form.Controls.Add($lblToken)
    $txtToken = New-Object System.Windows.Forms.TextBox
    $txtToken.Location = New-Object System.Drawing.Point(220, $y)
    $txtToken.Size = New-Object System.Drawing.Size(270, $alto)
    $txtToken.UseSystemPasswordChar = $true
    if ($script:Config -and (Get-TokenDescifrado)) { $txtToken.Text = Get-TokenDescifrado }
    $form.Controls.Add($txtToken)
    $y += 24

    $linkToken = New-Object System.Windows.Forms.LinkLabel
    $linkToken.Text = '¿Cómo consigo un token? (abre GitHub)'
    $linkToken.Location = New-Object System.Drawing.Point(220, $y)
    $linkToken.Size = New-Object System.Drawing.Size(270, $alto)
    $linkToken.Add_LinkClicked({
        Start-Process 'https://github.com/settings/tokens/new?scopes=repo&description=GestorSubidasWeb'
    })
    $form.Controls.Add($linkToken)
    $y += 38

    $lblRepo = New-Object System.Windows.Forms.Label
    $lblRepo.Text = 'URL del repositorio:'
    $lblRepo.Location = New-Object System.Drawing.Point(15, $y)
    $lblRepo.Size = New-Object System.Drawing.Size(200, $alto)
    $form.Controls.Add($lblRepo)
    $txtRepo = New-Object System.Windows.Forms.TextBox
    $txtRepo.Location = New-Object System.Drawing.Point(220, $y)
    $txtRepo.Size = New-Object System.Drawing.Size(270, $alto)
    $txtRepo.Text = if ($script:Config) { $script:Config.RepoUrl } else { '' }
    $form.Controls.Add($txtRepo)
    $y += 24

    $lblRepoAyuda = New-Object System.Windows.Forms.Label
    $lblRepoAyuda.Text = 'Ejemplo: https://github.com/tuusuario/turepositorio.git'
    $lblRepoAyuda.Location = New-Object System.Drawing.Point(220, $y)
    $lblRepoAyuda.Size = New-Object System.Drawing.Size(270, 16)
    $lblRepoAyuda.ForeColor = [System.Drawing.Color]::Gray
    $lblRepoAyuda.Font = New-Object System.Drawing.Font($lblRepoAyuda.Font.FontFamily, 7.5)
    $form.Controls.Add($lblRepoAyuda)
    $y += 38

    $lblEmail = New-Object System.Windows.Forms.Label
    $lblEmail.Text = 'Correo para los commits:'
    $lblEmail.Location = New-Object System.Drawing.Point(15, $y)
    $lblEmail.Size = New-Object System.Drawing.Size(200, $alto)
    $form.Controls.Add($lblEmail)
    $txtEmail = New-Object System.Windows.Forms.TextBox
    $txtEmail.Location = New-Object System.Drawing.Point(220, $y)
    $txtEmail.Size = New-Object System.Drawing.Size(270, $alto)
    $txtEmail.Text = if ($script:Config) { $script:Config.Email } else { '' }
    $form.Controls.Add($txtEmail)
    $y += 24

    $lblEmailAyuda = New-Object System.Windows.Forms.Label
    $lblEmailAyuda.Text = '(Opcional: si lo dejas vacío, se usa uno genérico)'
    $lblEmailAyuda.Location = New-Object System.Drawing.Point(220, $y)
    $lblEmailAyuda.Size = New-Object System.Drawing.Size(270, 16)
    $lblEmailAyuda.ForeColor = [System.Drawing.Color]::Gray
    $lblEmailAyuda.Font = New-Object System.Drawing.Font($lblEmailAyuda.Font.FontFamily, 7.5)
    $form.Controls.Add($lblEmailAyuda)
    $y += 38

    $lblFolder = New-Object System.Windows.Forms.Label
    $lblFolder.Text = 'Carpeta del proyecto:'
    $lblFolder.Location = New-Object System.Drawing.Point(15, $y)
    $lblFolder.Size = New-Object System.Drawing.Size(200, $alto)
    $form.Controls.Add($lblFolder)
    $txtFolder = New-Object System.Windows.Forms.TextBox
    $txtFolder.Location = New-Object System.Drawing.Point(220, $y)
    $txtFolder.Size = New-Object System.Drawing.Size(200, $alto)
    $txtFolder.Text = if ($script:Config -and $script:Config.Carpeta) { $script:Config.Carpeta } else { Get-CarpetaProyectoPorDefecto }
    $form.Controls.Add($txtFolder)
    $btnBrowse = New-Object System.Windows.Forms.Button
    $btnBrowse.Text = '...'
    $btnBrowse.Location = New-Object System.Drawing.Point(425, $y)
    $btnBrowse.Size = New-Object System.Drawing.Size(65, $alto)
    $btnBrowse.Add_Click({
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        if ($txtFolder.Text -and (Test-Path $txtFolder.Text)) { $dlg.SelectedPath = $txtFolder.Text }
        if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $txtFolder.Text = $dlg.SelectedPath
        }
    })
    $form.Controls.Add($btnBrowse)
    $y += $salto

    $lblEstado = New-Object System.Windows.Forms.Label
    $lblEstado.Location = New-Object System.Drawing.Point(15, $y)
    $lblEstado.Size = New-Object System.Drawing.Size(475, 40)
    $lblEstado.ForeColor = [System.Drawing.Color]::DarkRed
    $form.Controls.Add($lblEstado)
    $y += 46

    $btnGuardar = New-Object System.Windows.Forms.Button
    $btnGuardar.Text = 'Guardar'
    $btnGuardar.Location = New-Object System.Drawing.Point(220, $y)
    $btnGuardar.Size = New-Object System.Drawing.Size(120, 30)
    $form.Controls.Add($btnGuardar)

    $btnCancelar = New-Object System.Windows.Forms.Button
    $btnCancelar.Text = 'Cancelar'
    $btnCancelar.Location = New-Object System.Drawing.Point(370, $y)
    $btnCancelar.Size = New-Object System.Drawing.Size(120, 30)
    $btnCancelar.Add_Click({ $form.Close() })
    $form.Controls.Add($btnCancelar)

    $btnGuardar.Add_Click({
        $lblEstado.Text = ''
        if (-not $txtUser.Text -or -not $txtToken.Text -or -not $txtRepo.Text -or -not $txtFolder.Text) {
            $lblEstado.Text = 'Rellena usuario, token, URL del repositorio y carpeta.'
            return
        }
        if (-not (Test-GitDisponible)) {
            $r = [System.Windows.Forms.MessageBox]::Show(
                "No encuentro Git en este PC. Es necesario para subir cambios a GitHub.`n`n¿Quieres abrir ahora la página de descarga?",
                'Falta Git', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Warning)
            if ($r -eq [System.Windows.Forms.DialogResult]::Yes) {
                Start-Process 'https://git-scm.com/download/win'
            }
            return
        }

        Save-Config -Usuario $txtUser.Text.Trim() -Token $txtToken.Text -RepoUrl $txtRepo.Text.Trim() -Carpeta $txtFolder.Text.Trim() -Email $txtEmail.Text.Trim()

        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        $resultado = Initialize-Repositorio -Carpeta $script:Config.Carpeta -RepoUrl $script:Config.RepoUrl
        $form.Cursor = [System.Windows.Forms.Cursors]::Default

        if ($resultado.TieneHistoriaRemota) {
            [System.Windows.Forms.MessageBox]::Show(
                "Aviso: el repositorio de GitHub ya tiene contenido subido anteriormente (rama '$($resultado.RamaRemota)').`n`nSi la carpeta de este proyecto no coincide con ese contenido, la primera subida puede ser rechazada para no perder nada. Si eso pasa, la app te ofrecerá la opción de forzarla.",
                'Repositorio existente', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
        }

        $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $form.Close()
    })

    $form.ShowDialog() | Out-Null
}

# ------------------------------------------------------------------
# Ventana principal
# ------------------------------------------------------------------

function Show-VentanaPrincipal {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Gestor de Subidas Web — Pictosfera'
    $form.Size = New-Object System.Drawing.Size(560, 520)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false

    $lblEstado = New-Object System.Windows.Forms.Label
    $lblEstado.Location = New-Object System.Drawing.Point(15, 15)
    $lblEstado.Size = New-Object System.Drawing.Size(530, 40)
    $form.Controls.Add($lblEstado)

    $btnConfig = New-Object System.Windows.Forms.Button
    $btnConfig.Text = 'Configuración'
    $btnConfig.Location = New-Object System.Drawing.Point(15, 60)
    $btnConfig.Size = New-Object System.Drawing.Size(150, 32)
    $form.Controls.Add($btnConfig)

    $btnBuscar = New-Object System.Windows.Forms.Button
    $btnBuscar.Text = 'Buscar cambios'
    $btnBuscar.Location = New-Object System.Drawing.Point(175, 60)
    $btnBuscar.Size = New-Object System.Drawing.Size(150, 32)
    $form.Controls.Add($btnBuscar)

    $lblLista = New-Object System.Windows.Forms.Label
    $lblLista.Text = 'Archivos con cambios:'
    $lblLista.Location = New-Object System.Drawing.Point(15, 105)
    $lblLista.Size = New-Object System.Drawing.Size(300, 20)
    $form.Controls.Add($lblLista)

    $lstCambios = New-Object System.Windows.Forms.ListBox
    $lstCambios.Location = New-Object System.Drawing.Point(15, 128)
    $lstCambios.Size = New-Object System.Drawing.Size(530, 180)
    $form.Controls.Add($lstCambios)

    $lblMensaje = New-Object System.Windows.Forms.Label
    $lblMensaje.Text = 'Mensaje del cambio (opcional):'
    $lblMensaje.Location = New-Object System.Drawing.Point(15, 318)
    $lblMensaje.Size = New-Object System.Drawing.Size(300, 20)
    $form.Controls.Add($lblMensaje)

    $txtMensaje = New-Object System.Windows.Forms.TextBox
    $txtMensaje.Location = New-Object System.Drawing.Point(15, 340)
    $txtMensaje.Size = New-Object System.Drawing.Size(530, 22)
    $form.Controls.Add($txtMensaje)

    $btnSubir = New-Object System.Windows.Forms.Button
    $btnSubir.Text = 'Subir cambios a GitHub'
    $btnSubir.Location = New-Object System.Drawing.Point(15, 372)
    $btnSubir.Size = New-Object System.Drawing.Size(530, 36)
    $btnSubir.Enabled = $false
    $form.Controls.Add($btnSubir)

    $txtLog = New-Object System.Windows.Forms.TextBox
    $txtLog.Location = New-Object System.Drawing.Point(15, 418)
    $txtLog.Size = New-Object System.Drawing.Size(530, 60)
    $txtLog.Multiline = $true
    $txtLog.ScrollBars = 'Vertical'
    $txtLog.ReadOnly = $true
    $txtLog.BackColor = [System.Drawing.Color]::WhiteSmoke
    $form.Controls.Add($txtLog)

    function Escribir-Log([string]$texto) {
        $hora = Get-Date -Format 'HH:mm:ss'
        $txtLog.AppendText("[$hora] $texto`r`n")
    }

    function Actualizar-Estado {
        $script:Config = Load-Config
        if (-not $script:Config -or -not $script:Config.RepoUrl) {
            $lblEstado.Text = 'Sin configurar todavía. Pulsa "Configuración" para empezar.'
            $btnBuscar.Enabled = $false
        } else {
            $lblEstado.Text = "Carpeta: $($script:Config.Carpeta)`nRepositorio: $($script:Config.RepoUrl)"
            $btnBuscar.Enabled = $true
        }
    }

    function Buscar-Cambios {
        $lstCambios.Items.Clear()
        $btnSubir.Enabled = $false
        if (-not $script:Config -or -not $script:Config.RepoUrl) { return }
        if (-not (Test-GitDisponible)) {
            Escribir-Log 'No encuentro Git instalado. Ve a Configuración.'
            return
        }
        Escribir-Log 'Buscando cambios...'
        $res = Get-CambiosPendientes
        if ($res.Error) {
            Escribir-Log "No se pudo comprobar el repositorio: $($res.Error)"
            return
        }
        if ($res.Cambios.Count -eq 0) {
            Escribir-Log 'No hay cambios. Todo está actualizado en GitHub.'
        } else {
            foreach ($c in $res.Cambios) { $lstCambios.Items.Add($c) | Out-Null }
            Escribir-Log "$($res.Cambios.Count) archivo(s) con cambios encontrados."
            [System.Windows.Forms.MessageBox]::Show(
                "Se han detectado $($res.Cambios.Count) archivo(s) con cambios en tu proyecto.`n`nRevisa la lista y pulsa 'Subir cambios a GitHub' cuando quieras publicarlos.",
                'Cambios detectados', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
            $btnSubir.Enabled = $true
        }
    }

    $btnConfig.Add_Click({
        Show-VentanaConfiguracion
        Actualizar-Estado
        Buscar-Cambios
    })

    $btnBuscar.Add_Click({ Buscar-Cambios })

    $btnSubir.Add_Click({
        $mensaje = $txtMensaje.Text.Trim()
        if (-not $mensaje) {
            $mensaje = "Actualización " + (Get-Date -Format 'dd/MM/yyyy HH:mm')
        }
        $btnSubir.Enabled = $false
        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        Escribir-Log 'Subiendo cambios a GitHub...'
        $resultado = Publish-Cambios -Mensaje $mensaje
        $form.Cursor = [System.Windows.Forms.Cursors]::Default

        if ($resultado.Ok) {
            Escribir-Log $resultado.Mensaje
            $lstCambios.Items.Clear()
            $txtMensaje.Text = ''
            [System.Windows.Forms.MessageBox]::Show($resultado.Mensaje, 'Hecho', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
        } elseif ($resultado.ErrorHistoria) {
            Escribir-Log $resultado.Mensaje
            $r = [System.Windows.Forms.MessageBox]::Show(
                "$($resultado.Mensaje)`n`n¿Quieres forzar la subida y reemplazar lo que hay en GitHub con el contenido de esta carpeta? Esta acción no se puede deshacer.",
                'Conflicto con el repositorio', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Warning)
            if ($r -eq [System.Windows.Forms.DialogResult]::Yes) {
                $forzado = Publish-CambiosForzado
                Escribir-Log $forzado.Mensaje
                if ($forzado.Ok) {
                    $lstCambios.Items.Clear()
                    $txtMensaje.Text = ''
                }
            }
            $btnSubir.Enabled = $true
        } else {
            Escribir-Log $resultado.Mensaje
            [System.Windows.Forms.MessageBox]::Show($resultado.Mensaje, 'Error', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
            $btnSubir.Enabled = $true
        }
    })

    Actualizar-Estado
    if (-not (Test-GitDisponible)) {
        Escribir-Log 'Aviso: no encuentro Git instalado en este PC. Hace falta para poder subir cambios.'
    }

    $form.Add_Shown({
        $form.Activate()
        if ($script:Config -and $script:Config.RepoUrl) {
            Buscar-Cambios
        }
    })
    [System.Windows.Forms.Application]::Run($form)
}

# ------------------------------------------------------------------
# Arranque
# ------------------------------------------------------------------

$script:Config = Load-Config
Show-VentanaPrincipal
