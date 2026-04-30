import { useEffect, useMemo, useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

const TOOLBAR_BUTTON_CLASS =
  "px-2 py-1 text-xs font-semibold rounded border border-gray-300 bg-white hover:bg-gray-50";
const INLINE_STYLE_SELECTOR =
  "strong,b,em,i,u,s,strike,sub,sup,span[style],font,mark,a";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요.",
  minHeightClassName = "min-h-40",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [selectionTick, setSelectionTick] = useState(0);
  const [inlineToggleState, setInlineToggleState] = useState<{ bold: boolean; underline: boolean }>({
    bold: false,
    underline: false,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, commandValue);
    onChange(editor.innerHTML);
    setSelectionTick((prev) => prev + 1);
  };

  const runInlineCommandToggle = (command: "bold" | "underline") => {
    const editor = editorRef.current;
    const selection = getSelectionInEditor();
    if (!editor || !selection || selection.rangeCount === 0) return;
    editor.focus();

    document.execCommand(command);
    try {
      const nextState = document.queryCommandState(command);
      setInlineToggleState((prev) => ({ ...prev, [command]: nextState }));
    } catch (_error) {
      // ignore
    }
    onChange(editor.innerHTML);
    setSelectionTick((prev) => prev + 1);
  };

  const getSelectionInEditor = (): Selection | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const anchor = selection.anchorNode;
    if (!anchor || !editor.contains(anchor)) return null;
    return selection;
  };

  const clearTypingStyleState = () => {
    const commands = ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript"];
    for (const command of commands) {
      try {
        if (document.queryCommandState(command)) {
          document.execCommand(command);
        }
      } catch (_error) {
        // ignore unsupported command
      }
    }
    // collapsed selection에서도 남아있는 typing style을 제거
    document.execCommand("removeFormat");
  };

  const isCaretAtAncestorBoundary = (
    range: Range,
    ancestor: HTMLElement,
    direction: "backward" | "forward"
  ): boolean => {
    if (!range.collapsed) return false;
    const probe = document.createRange();
    probe.selectNodeContents(ancestor);
    if (direction === "backward") {
      probe.setEnd(range.startContainer, range.startOffset);
    } else {
      probe.setStart(range.startContainer, range.startOffset);
    }
    const text = probe.toString().replace(/\u200B/g, "").trim();
    return text.length === 0;
  };

  const moveCaretOutsideInlineStyleIfNeeded = (direction: "backward" | "forward") => {
    const editor = editorRef.current;
    const selection = getSelectionInEditor();
    if (!editor || !selection) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    const startNode = range.startContainer;
    const anchorElement =
      startNode.nodeType === Node.ELEMENT_NODE
        ? (startNode as Element)
        : (startNode.parentElement as Element | null);
    if (!anchorElement) return;

    const inlineAncestor = anchorElement.closest(INLINE_STYLE_SELECTOR) as HTMLElement | null;
    if (!inlineAncestor || !editor.contains(inlineAncestor)) return;

    if (!isCaretAtAncestorBoundary(range, inlineAncestor, direction)) return;

    const nextRange = document.createRange();
    if (direction === "backward") {
      nextRange.setStartBefore(inlineAncestor);
    } else {
      nextRange.setStartAfter(inlineAncestor);
    }
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    clearTypingStyleState();
    setSelectionTick((prev) => prev + 1);
  };

  const toggleBlockquote = () => {
    const editor = editorRef.current;
    const selection = getSelectionInEditor();
    if (!editor || !selection || selection.rangeCount === 0) return;
    editor.focus();

    const range = selection.getRangeAt(0);
    const anchorElement =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
    const isInBlockquote = Boolean(anchorElement?.closest("blockquote"));

    // 인용 토글: 적용/해제 모두 실제 문서 블록 상태 변경
    document.execCommand("formatBlock", false, isInBlockquote ? "p" : "blockquote");
    onChange(editor.innerHTML);
    setSelectionTick((prev) => prev + 1);
  };

  const isLiEffectivelyEmpty = (li: HTMLLIElement): boolean => {
    const text = (li.textContent || "").replace(/\u200B/g, "").trim();
    if (text.length > 0) return false;
    // 브라우저가 빈 li를 <br>로 유지하는 케이스 허용
    return Array.from(li.children).every((child) => child.tagName.toLowerCase() === "br");
  };

  const isCaretAtStartOfLi = (range: Range, li: HTMLLIElement): boolean => {
    if (!range.collapsed) return false;
    const probe = document.createRange();
    probe.selectNodeContents(li);
    probe.setEnd(range.startContainer, range.startOffset);
    const beforeText = probe.toString().replace(/\u200B/g, "").trim();
    return beforeText.length === 0;
  };

  const handleBackspaceOnEmptyListItem = (): boolean => {
    const editor = editorRef.current;
    const selection = getSelectionInEditor();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    const anchorElement =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement;
    const li = anchorElement?.closest("li") as HTMLLIElement | null;
    if (!li || !editor.contains(li)) return false;
    if (!isLiEffectivelyEmpty(li)) return false;
    if (!isCaretAtStartOfLi(range, li)) return false;

    // 빈 목록 항목에서 Backspace 시 이전 항목 병합 대신 목록 해제
    document.execCommand("outdent");
    document.execCommand("formatBlock", false, "p");
    clearTypingStyleState();
    onChange(editor.innerHTML);
    setSelectionTick((prev) => prev + 1);
    return true;
  };

  useEffect(() => {
    const onSelectionChange = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const anchor = selection.anchorNode;
      if (anchor && editor.contains(anchor)) {
        const next = { bold: false, underline: false };
        try {
          next.bold = document.queryCommandState("bold");
          next.underline = document.queryCommandState("underline");
        } catch (_error) {
          // ignore
        }
        setInlineToggleState(next);
        setSelectionTick((prev) => prev + 1);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const isActive = (command: string): boolean => {
    // selectionTick 의존으로 커서 이동/선택 시 재평가되도록 유지
    void selectionTick;
    try {
      return document.queryCommandState(command);
    } catch (_error) {
      return false;
    }
  };

  const getNodeActiveState = () => {
    void selectionTick;
    const selection = getSelectionInEditor();
    const anchor = selection?.anchorNode;
    const element =
      anchor?.nodeType === Node.ELEMENT_NODE
        ? (anchor as Element)
        : (anchor?.parentElement as Element | null);
    if (!element) {
      return {
        bold: false,
        underline: false,
        unorderedList: false,
        orderedList: false,
        blockquote: false,
        link: false,
      };
    }
    return {
      bold: inlineToggleState.bold || isActive("bold") || Boolean(element.closest("strong,b")),
      underline:
        inlineToggleState.underline ||
        isActive("underline") ||
        Boolean(element.closest("u")) ||
        element.style.textDecoration.includes("underline"),
      unorderedList: Boolean(element.closest("ul")),
      orderedList: Boolean(element.closest("ol")),
      blockquote: Boolean(element.closest("blockquote")),
      link: Boolean(element.closest("a")),
    };
  };

  const activeState = getNodeActiveState();

  const buttonClass = (active: boolean): string => `${TOOLBAR_BUTTON_CLASS} ${active ? "text-white" : ""}`;
  const buttonStyle = (active: boolean): React.CSSProperties | undefined =>
    active ? { backgroundColor: "#1A4D2E", borderColor: "#1A4D2E", color: "#ffffff" } : undefined;

  const editorClassName = useMemo(
    () =>
      `w-full px-3 py-2 outline-none ${minHeightClassName} [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#1A4D2E]/40 [&_blockquote]:pl-3 [&_blockquote]:text-gray-700`,
    [minHeightClassName]
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-2 px-3 py-2 border-b bg-gray-50">
        <button
          type="button"
          className={buttonClass(activeState.bold)}
          style={buttonStyle(activeState.bold)}
          onClick={() => runInlineCommandToggle("bold")}
        >
          굵게
        </button>
        <button
          type="button"
          className={buttonClass(activeState.underline)}
          style={buttonStyle(activeState.underline)}
          onClick={() => runInlineCommandToggle("underline")}
        >
          밑줄
        </button>
        <button
          type="button"
          className={buttonClass(activeState.unorderedList)}
          style={buttonStyle(activeState.unorderedList)}
          onClick={() => runCommand("insertUnorderedList")}
        >
          목록
        </button>
        <button
          type="button"
          className={buttonClass(activeState.orderedList)}
          style={buttonStyle(activeState.orderedList)}
          onClick={() => runCommand("insertOrderedList")}
        >
          번호목록
        </button>
        <button
          type="button"
          className={buttonClass(activeState.blockquote)}
          style={buttonStyle(activeState.blockquote)}
          onClick={toggleBlockquote}
        >
          인용
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("removeFormat")}>
          서식해제
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={(event) => {
          if (event.key === "Backspace") {
            if (handleBackspaceOnEmptyListItem()) {
              event.preventDefault();
              return;
            }
            window.setTimeout(() => moveCaretOutsideInlineStyleIfNeeded("backward"), 0);
          } else if (event.key === "Delete") {
            window.setTimeout(() => moveCaretOutsideInlineStyleIfNeeded("forward"), 0);
          }
        }}
        onBeforeInput={(event) => {
          const inputEvent = event.nativeEvent as InputEvent;
          if (inputEvent.inputType === "deleteContentBackward") {
            window.setTimeout(() => moveCaretOutsideInlineStyleIfNeeded("backward"), 0);
          } else if (inputEvent.inputType === "deleteContentForward") {
            window.setTimeout(() => moveCaretOutsideInlineStyleIfNeeded("forward"), 0);
          }
        }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className={editorClassName}
        data-placeholder={placeholder}
      />
    </div>
  );
}

