// Expo config plugin — zabetonuje iOS Podfile fixy, aby přežily `expo prebuild`.
// 1) EXCLUDED_ARCHS x86_64 pro simulátor (M1 — jinak "could not find module 'Expo' for x86_64").
// 2) Min IPHONEOS_DEPLOYMENT_TARGET 15.1 na všech Pod targetech (Xcode 27 odmítá < 15.0 jako ERROR;
//    spousta Pods má 9–13: Google*, SDWebImage, PromisesObjC, nanopb, RNSVG, GTMSessionFetcher…).
// Vkládá se do post_install bloku vygenerovaného expo prebuildem.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# slackline-ios-fixes';

const INJECT = `
    ${MARKER} — EXCLUDED_ARCHS (M1 simulator) + min deployment target 15.1 (Xcode 27)
    installer.pods_project.build_configurations.each do |c|
      c.build_settings["EXCLUDED_ARCHS[sdk=iphonesimulator*]"] = "x86_64"
    end
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings["EXCLUDED_ARCHS[sdk=iphonesimulator*]"] = "x86_64"
        dt = c.build_settings["IPHONEOS_DEPLOYMENT_TARGET"]
        if dt.nil? || dt.to_f < 15.1
          c.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
        end
      end
    end
`;

module.exports = function withSlacklineIosFixes(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return cfg;

      // vložit před "  end\nend" uzavírající post_install blok
      const marker = '\n  end\nend';
      const idx = contents.lastIndexOf(marker);
      if (idx < 0) {
        throw new Error('withSlacklineIosFixes: nenalezen konec post_install bloku v Podfile');
      }
      contents = contents.slice(0, idx) + '\n' + INJECT + contents.slice(idx + 1);
      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
