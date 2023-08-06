/* eslint-env node */
/* eslint import/no-nodejs-modules:off */

import fs from 'fs';

import {glob} from 'glob';
import prettier from 'prettier';
import SignedSource from 'signedsource';
import webpack from 'webpack';

type GlobPattern = Parameters<typeof glob>[0];
type Options = {
  cwd: string;
  output: string;
  pattern: GlobPattern;
};

class ListFilesPlugin {
  name = 'ListFilesPlugin';
  isWatchMode: boolean = false;

  cwd: string;
  pattern: GlobPattern;
  output: string;

  constructor({cwd, pattern, output}: Options) {
    this.cwd = cwd;
    this.pattern = pattern;
    this.output = output;
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.watchRun.tapAsync(this.name, async (_, callback) => {
      this.isWatchMode = true;
      await this.build();
      callback();
    });

    compiler.hooks.beforeRun.tapAsync(this.name, async (_, callback) => {
      if (this.isWatchMode) {
        callback();
        return;
      }

      await this.build();
      callback();
    });
  }

  async build() {
    const files = await this.findFiles();
    const content = this.template(files);
    const formatted = await this.formatOutput(content);
    const signed = SignedSource.signFile(formatted);

    if (this.isChanged(signed)) {
      this.writeFile(signed);
    }
  }

  async findFiles() {
    const files = await glob(this.pattern, {
      cwd: this.cwd,
    });

    return files;
  }

  template(files: string[]) {
    return `
      // THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
      //
      // Generated by ListFilesPlugin
      // ${SignedSource.getSigningToken()}
      //
      // This script contains a list of story files to be dynamically loaded by our
      // component library.

      const FilesList: string[] = ${JSON.stringify(files, undefined, 2)}

      export {FilesList}
    `;
  }

  async formatOutput(unformatted: string) {
    const config = await prettier.resolveConfig(this.output);
    if (config) {
      return prettier.format(unformatted, {...config, parser: 'babel'});
    }
    return unformatted;
  }

  isChanged(signed: string) {
    try {
      const origContent = fs.readFileSync(this.output, 'utf8');
      return origContent !== signed;
    } catch {
      return true;
    }
  }

  writeFile(content: string) {
    const tmpFile = this.output + '.tmp';

    fs.writeFileSync(tmpFile, content);
    fs.renameSync(tmpFile, this.output);
  }
}

export default ListFilesPlugin;
