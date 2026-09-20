# Showcase: PowerShell — cmdlets, objects, and remoting.
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$InputFile,

    [ValidateSet('dark', 'light')]
    [string]$Theme = 'dark',

    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$VERSION = '0.4.0'

class Span {
    [int]$Start
    [int]$End
    [string]$Kind = 'other'

    Span([int]$s, [int]$e, [string]$k) {
        $this.Start, $this.End, $this.Kind = $s, $e, $k
    }

    [int] Width() { return $this.End - $this.Start }
    [string] ToString() { return "$($this.Kind)[$($this.Start):$($this.End)]" }
}

function Get-Tokens {
    [OutputType([Span[]])]
    param([Parameter(ValueFromPipeline)][string]$Source)

    process {
        if ([string]::IsNullOrWhiteSpace($Source)) { throw 'empty source' }
        $off = 0
        foreach ($word in $Source -split '\s+') {
            $kind = switch -Regex ($word) {
                '^#' { 'comment'; break }
                '^\d+$' { 'number'; break }
                '^(function|return|if)$' { 'keyword'; break }
                default { 'other' }
            }
            [Span]::new($off, $off + $word.Length, $kind)
            $off += $word.Length + 1
        }
    }
}

try {
    $text = Get-Content -Raw -Path $InputFile
    $toks = $text | Get-Tokens
    "{0} tokens" -f $toks.Count

    $groups = $toks | Group-Object Kind | Sort-Object Count -Descending
    $groups | Format-Table Name, Count -AutoSize | Out-String | Write-Host

    $users = @(
        [pscustomobject]@{ Name = 'ada'; Age = 36 }
        [pscustomobject]@{ Name = 'grace'; Age = 85 }
    )
    $users | Where-Object Age -ge 18 |
        Select-Object Name, @{ N = 'Double'; E = { $_.Age * 2 } } |
        ConvertTo-Json -Depth 2
}
catch {
    Write-Error "failed: $($_.Exception.Message)"
    exit 1
}
finally {
    Write-Verbose "done at $(Get-Date -Format o)"
}
