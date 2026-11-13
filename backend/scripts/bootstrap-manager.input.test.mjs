import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { assertInteractiveInput, readLine } from './bootstrap-manager.mjs';

class FakeTerminalInput extends EventEmitter {
  isTTY = true;
  rawModeChanges = [];

  setEncoding() {}

  setRawMode(enabled) {
    this.rawModeChanges.push(enabled);
  }

  resume() {}

  pause() {}
}

function fakeOutput() {
  const writes = [];
  return {
    writes,
    output: {
      write(value) {
        writes.push(value);
        return true;
      },
    },
  };
}

test('visible line input echoes typed characters and restores cooked mode', async () => {
  const input = new FakeTerminalInput();
  const { output, writes } = fakeOutput();
  const resultPromise = readLine('Username: ', { input, output });
  input.emit('data', 'manager\r');

  assert.equal(await resultPromise, 'manager');
  assert.deepEqual(writes, ['Username: ', 'm', 'a', 'n', 'a', 'g', 'e', 'r', '\n']);
  assert.deepEqual(input.rawModeChanges, [true, false]);
});

test('hidden input is never echoed', async () => {
  const input = new FakeTerminalInput();
  const { output, writes } = fakeOutput();
  const resultPromise = readLine('Password: ', { hidden: true, input, output });
  input.emit('data', 'do-not-echo\r');

  assert.equal(await resultPromise, 'do-not-echo');
  assert.deepEqual(writes, ['Password: ', '\n']);
  assert.deepEqual(input.rawModeChanges, [true, false]);
});

test('hidden input rejects terminals without raw-mode support with a safe code', () => {
  assert.throws(
    () => assertInteractiveInput({ isTTY: false }),
    (error) => error.code === 'INTERACTIVE_TTY_REQUIRED',
  );
});
