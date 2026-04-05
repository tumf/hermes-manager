'use client';

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

function langExtension(filePath: string) {
  if (filePath.endsWith('.md')) return markdown();
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return yaml();
  return markdown();
}

export interface CodeEditorHandle {
  insertTextAtSelection: (text: string) => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath: string;
  className?: string;
  ariaLabel?: string;
  dark?: boolean;
  readOnly?: boolean;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, filePath, className, ariaLabel, dark = true, readOnly = false },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);

  const getExtensions = useCallback(() => {
    const exts = [
      lineNumbers(),
      history(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      langExtension(filePath),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newVal = update.state.doc.toString();
          valueRef.current = newVal;
          onChangeRef.current(newVal);
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '14px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono, monospace)' },
        '.cm-content': { padding: '12px 0' },
        '.cm-gutters': { border: 'none' },
      }),
    ];
    if (dark) exts.push(oneDark);
    return exts;
  }, [filePath, dark, readOnly]);

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: getExtensions(),
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, dark, readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current && value !== valueRef.current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      valueRef.current = value;
    }
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      insertTextAtSelection: (text: string) => {
        const view = viewRef.current;
        if (!view || readOnly) return;

        const changes = view.state.selection.ranges.map((range) => ({
          from: range.from,
          to: range.to,
          insert: text,
        }));

        const primaryIndex = view.state.selection.mainIndex;
        const primaryRange = view.state.selection.ranges[primaryIndex];
        const anchor = primaryRange.from + text.length;

        view.dispatch({
          changes,
          selection: EditorSelection.cursor(anchor),
          scrollIntoView: true,
        });
        view.focus();
      },
    }),
    [readOnly],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
    />
  );
});
