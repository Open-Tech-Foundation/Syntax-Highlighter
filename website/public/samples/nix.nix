# Showcase: Nix — flakes, overlays, and modules.
{
  description = "Highlight demo dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        inherit (pkgs) lib mkShell nodejs_22;
      in
      {
        devShells.default = mkShell {
          packages = [ nodejs_22 ];
          shellHook = ''
            echo "node $(node --version)"
          '';
        };

        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "highlight-demo";
          version = "0.4.0";
          src = ./.;
          buildInputs = [ nodejs_22 ];
          buildPhase = "pnpm build";
          installPhase = "mkdir -p $out && cp -r dist/* $out/";
          meta = with lib; {
            description = "Semantic syntax highlighting";
            license = licenses.mit;
          };
        };

        overlays.default = final: prev: {
          demo = self.packages.${system}.default;
        };
      }) // {
        nixosModules.default = { config, ... }: {
          options.services.demo.enable = lib.mkEnableOption "demo";
        };
      };
}
