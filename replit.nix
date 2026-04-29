{pkgs}: {
  deps = [
    pkgs.osslsigncode
    pkgs.nsis
    pkgs.wineWowPackages.stable
  ];
}
