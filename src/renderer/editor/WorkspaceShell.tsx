import {
  Suspense,
  lazy,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type ReactElement,
  type RefObject,
  type SVGProps
} from "react";

import type {
  ActiveBlockState,
  ShortcutGroup
} from "@fishmark/editor-core";
import type { AppNotification } from "../../shared/app-update";
import type { Preferences, PreferencesUpdate } from "../../shared/preferences";
import type { ThemeEffectsMode } from "../../shared/theme-package";
import type { WorkspaceWindowSnapshot } from "../../shared/workspace";
import { CodeEditorView, type CodeEditorHandle } from "../code-editor-view";
import type { OutlineItem } from "../outline";
import type { ThemeRuntimeEnv } from "../theme-runtime-env";
import type { ThemeSurfaceRuntimeMode } from "../shader/theme-surface-runtime";
import { ThemeSurfaceHost, type ThemeSurfaceHostDescriptor } from "./ThemeSurfaceHost";
import { TitlebarHost } from "./TitlebarHost";
import type { ExternalMarkdownFileState } from "./editor-shell-state";
import { ShortcutHintOverlay } from "./shortcut-hint-overlay";
import type { TitlebarLayoutDescriptor } from "./titlebar-layout";
import type { ThemePackageEntry, ResolvedThemeMode } from "./useThemeController";

const SettingsView = lazy(async () => {
  const module = await import("./settings-view");
  return { default: module.SettingsView };
});

type ShellMode = "reading" | "editing";
type AppNotificationBannerState = "hidden" | "open" | "closing";
type TableToolTone = "default" | "danger";
type TableToolIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;
type TableToolAction = {
  id: string;
  label: string;
  tone: TableToolTone;
  icon: TableToolIconComponent;
  onClick: () => void;
};

function RowAboveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M12 3v4M10 5h4M4 9h16M4 9v11M20 9v11M8 9v11M16 9v11M4 14.5h16" />
    </svg>
  );
}

function RowBelowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M4 4h16M4 4v11M20 4v11M8 4v11M16 4v11M4 9.5h16M12 17v4M10 19h4" />
    </svg>
  );
}

function ColumnLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M4 4h14M4 20h14M8 4v16M13 4v16M18 4v16M2 12h4M4 10v4" />
    </svg>
  );
}

function ColumnRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M6 4h14M6 20h14M6 4v16M11 4v16M16 4v16M18 12h4M20 10v4" />
    </svg>
  );
}

function DeleteRowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M4 4h16M4 4v16M20 4v16M8 4v16M16 4v16M4 9.5h16M9 14.5h6" />
      <path d="M18 12l3 3M21 12l-3 3" />
    </svg>
  );
}

function DeleteColumnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M4 4h16M4 20h16M4 4v16M9 4v16M14 4v16M4 9.5h16M4 14.5h16" />
      <path d="M17 3l3 3M20 3l-3 3" />
    </svg>
  );
}

function DeleteTableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" {...props}>
      <path d="M5 5h14M5 5v14M19 5v14M9.5 5v14M14.5 5v14M5 9.5h14M5 14.5h14" />
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

function SettingsDrawerFallback({ surfaceState }: { surfaceState: "open" | "closing" }) {
  return (
    <section
      className="settings-shell"
      data-fishmark-panel="settings-drawer"
      data-fishmark-surface="settings-drawer"
      data-state={surfaceState}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
    />
  );
}

export type WorkspaceShellProps = {
  workspaceSnapshot: WorkspaceWindowSnapshot | null;
  activeHeadingId: string | null;
  activeShortcutGroup: ShortcutGroup;
  activeTableToolId: string | null;
  activeThemePackageSurface?: never;
  activeTitlebarSurface: ThemeSurfaceHostDescriptor | null;
  activeWorkbenchSurface: ThemeSurfaceHostDescriptor | null;
  appUpdateStatusLabel: string | null;
  appVersionLabel: string;
  controlledTitlebarEnabled: boolean;
  currentDocumentMetrics: { meaningfulCharacterCount: number } | null;
  effectiveSaveState: "idle" | "manual-saving" | "autosaving";
  editorContainerRef: RefObject<HTMLDivElement | null>;
  editorLoadRevision: number;
  editorRef: RefObject<CodeEditorHandle | null>;
  externalFileConflictMessage: string;
  externalFileState: ExternalMarkdownFileState;
  fishmarkPlatform: NodeJS.Platform;
  fontFamilies: string[];
  headerDetail: string;
  headerEyebrow: string;
  headerTitle: string;
  hintText: string;
  isDocumentOpen: boolean;
  isOutlineOpen: boolean;
  isOutlinePanelVisible: boolean;
  isReadingMode: boolean;
  isRefreshingThemePackages: boolean;
  isSettingsDrawerVisible: boolean;
  isSettingsOpen: boolean;
  isShortcutHintVisible: boolean;
  notification: AppNotification | null;
  notificationState: AppNotificationBannerState;
  outlineItems: OutlineItem[];
  preferences: Preferences;
  preferencesThemeEffectsMode: ThemeEffectsMode;
  resolvedThemeMode: ResolvedThemeMode;
  saveStatusLabel: string;
  settingsEntryRef: RefObject<HTMLButtonElement | null>;
  shellMode: ShellMode;
  themePackages: ThemePackageEntry[];
  themeRuntimeEnv: ThemeRuntimeEnv;
  titlebarHeight: number;
  titlebarLayout: TitlebarLayoutDescriptor;
  onActiveBlockChange: (activeBlockState: ActiveBlockState) => void;
  onAppWorkspaceMouseDownCapture: (event: MouseEvent<HTMLElement>) => void;
  onCaptureSettingsOpenOrigin: () => void;
  onCloseOutlinePanel: () => void;
  onCloseSettingsDrawer: () => void;
  onCloseWorkspaceTab: (tabId: string) => void;
  onDismissExternalFileConflict: () => void;
  onDraftChange: (content: string) => void;
  onEditorBlur: () => void;
  onImportClipboardImage: (input: { documentPath: string | null }) => Promise<string | null>;
  onInsertTableColumnLeft: () => void;
  onInsertTableColumnRight: () => void;
  onInsertTableRowAbove: () => void;
  onInsertTableRowBelow: () => void;
  onDeleteTable: () => void;
  onDeleteTableColumn: () => void;
  onDeleteTableRow: () => void;
  onKeepMemoryVersion: () => void;
  onNavigateToOutlineItem: (startOffset: number) => void;
  onOpenOutlinePanel: () => void;
  onReloadExternalFile: () => void;
  onSaveAs: () => void;
  onSettingsOpen: () => void;
  onTableToolHoverChange: (toolId: string | null) => void;
  onTabActivate: (tabId: string) => void;
  onTabDragEnd: (tabId: string) => void;
  onTabDragOver: (event: DragEvent<HTMLElement>) => void;
  onTabDragStart: (tabId: string, event: DragEvent<HTMLElement>) => void;
  onTabDrop: (tabId: string, index: number, event: DragEvent<HTMLElement>) => void;
  onTitlebarSurfaceRuntimeModeChange: (mode: ThemeSurfaceRuntimeMode) => void;
  onUpdatePreferences: (
    patch: PreferencesUpdate
  ) => Promise<Awaited<ReturnType<Window["fishmark"]["updatePreferences"]>>>;
  onRefreshThemePackages: () => Promise<void>;
  onWorkbenchSurfaceRuntimeModeChange: (mode: ThemeSurfaceRuntimeMode) => void;
};

function createTableToolActions({
  onDeleteTable,
  onDeleteTableColumn,
  onDeleteTableRow,
  onInsertTableColumnLeft,
  onInsertTableColumnRight,
  onInsertTableRowAbove,
  onInsertTableRowBelow
}: Pick<
  WorkspaceShellProps,
  | "onDeleteTable"
  | "onDeleteTableColumn"
  | "onDeleteTableRow"
  | "onInsertTableColumnLeft"
  | "onInsertTableColumnRight"
  | "onInsertTableRowAbove"
  | "onInsertTableRowBelow"
>): TableToolAction[] {
  return [
    {
      id: "row-above",
      label: "Row Above",
      tone: "default",
      icon: RowAboveIcon,
      onClick: onInsertTableRowAbove
    },
    {
      id: "row-below",
      label: "Row Below",
      tone: "default",
      icon: RowBelowIcon,
      onClick: onInsertTableRowBelow
    },
    {
      id: "column-left",
      label: "Column Left",
      tone: "default",
      icon: ColumnLeftIcon,
      onClick: onInsertTableColumnLeft
    },
    {
      id: "column-right",
      label: "Column Right",
      tone: "default",
      icon: ColumnRightIcon,
      onClick: onInsertTableColumnRight
    },
    {
      id: "delete-row",
      label: "Delete Row",
      tone: "danger",
      icon: DeleteRowIcon,
      onClick: onDeleteTableRow
    },
    {
      id: "delete-column",
      label: "Delete Column",
      tone: "danger",
      icon: DeleteColumnIcon,
      onClick: onDeleteTableColumn
    },
    {
      id: "delete-table",
      label: "Delete Table",
      tone: "danger",
      icon: DeleteTableIcon,
      onClick: onDeleteTable
    }
  ];
}

export function WorkspaceShell({
  activeHeadingId,
  activeShortcutGroup,
  activeTableToolId,
  activeTitlebarSurface,
  activeWorkbenchSurface,
  appUpdateStatusLabel,
  appVersionLabel,
  controlledTitlebarEnabled,
  currentDocumentMetrics,
  editorContainerRef,
  editorLoadRevision,
  editorRef,
  externalFileConflictMessage,
  externalFileState,
  fishmarkPlatform,
  fontFamilies,
  headerDetail,
  headerEyebrow,
  headerTitle,
  hintText,
  isDocumentOpen,
  isOutlineOpen,
  isOutlinePanelVisible,
  isReadingMode,
  isRefreshingThemePackages,
  isSettingsDrawerVisible,
  isSettingsOpen,
  isShortcutHintVisible,
  notification,
  notificationState,
  outlineItems,
  preferences,
  preferencesThemeEffectsMode,
  resolvedThemeMode,
  saveStatusLabel,
  settingsEntryRef,
  shellMode,
  themePackages,
  themeRuntimeEnv,
  titlebarHeight,
  titlebarLayout,
  workspaceSnapshot,
  onActiveBlockChange,
  onAppWorkspaceMouseDownCapture,
  onCaptureSettingsOpenOrigin,
  onCloseOutlinePanel,
  onCloseSettingsDrawer,
  onCloseWorkspaceTab,
  onDeleteTable,
  onDeleteTableColumn,
  onDeleteTableRow,
  onDismissExternalFileConflict,
  onDraftChange,
  onEditorBlur,
  onImportClipboardImage,
  onInsertTableColumnLeft,
  onInsertTableColumnRight,
  onInsertTableRowAbove,
  onInsertTableRowBelow,
  onKeepMemoryVersion,
  onNavigateToOutlineItem,
  onOpenOutlinePanel,
  onReloadExternalFile,
  onRefreshThemePackages,
  onSaveAs,
  onSettingsOpen,
  onTableToolHoverChange,
  onTabActivate,
  onTabDragEnd,
  onTabDragOver,
  onTabDragStart,
  onTabDrop,
  onTitlebarSurfaceRuntimeModeChange,
  onUpdatePreferences,
  onWorkbenchSurfaceRuntimeModeChange
}: WorkspaceShellProps) {
  const activeDocument = workspaceSnapshot?.activeDocument ?? null;
  const workspaceTabs = workspaceSnapshot?.tabs ?? [];
  const activeTabId = workspaceSnapshot?.activeTabId ?? null;
  const tableToolActions = createTableToolActions({
    onDeleteTable,
    onDeleteTableColumn,
    onDeleteTableRow,
    onInsertTableColumnLeft,
    onInsertTableColumnRight,
    onInsertTableRowAbove,
    onInsertTableRowBelow
  });

  return (
    <main
      className="app-shell"
      data-fishmark-shell-mode={shellMode}
      style={
        {
          "--fishmark-titlebar-height": controlledTitlebarEnabled
            ? `${titlebarHeight}px`
            : "0px"
        } as CSSProperties
      }
    >
      {controlledTitlebarEnabled ? (
        <TitlebarHost
          platform={fishmarkPlatform}
          layout={titlebarLayout}
          title={headerTitle}
          isDirty={activeDocument?.isDirty ?? false}
          themeMode={resolvedThemeMode}
          runtimeEnv={themeRuntimeEnv}
          effectsMode={preferencesThemeEffectsMode}
          titlebarSurface={activeTitlebarSurface}
          onTitlebarSurfaceRuntimeModeChange={onTitlebarSurfaceRuntimeModeChange}
        />
      ) : null}
      <div
        className="app-layout"
        data-fishmark-shell-mode={shellMode}
        data-fishmark-has-document={isDocumentOpen ? "true" : "false"}
      >
        {activeWorkbenchSurface ? (
          <ThemeSurfaceHost
            surface="workbenchBackground"
            descriptor={activeWorkbenchSurface}
            themeMode={resolvedThemeMode}
            runtimeEnv={themeRuntimeEnv}
            effectsMode={preferencesThemeEffectsMode}
            onRuntimeModeChange={onWorkbenchSurfaceRuntimeModeChange}
          />
        ) : null}
        <aside
          className="app-rail"
          data-fishmark-layout="rail"
          data-fishmark-rail-mode={activeShortcutGroup.id}
          data-visibility={isDocumentOpen && isReadingMode ? "collapsed" : "visible"}
        >
          <div className="app-rail-brand">
            <p className="app-name">FishMark</p>
            <p className="app-subtitle">Desktop editor</p>
          </div>
          <div className="app-rail-content">
            <div
              className="app-rail-mode-group app-rail-mode-group-default"
              data-state={activeShortcutGroup.id === "default-text" ? "open" : "closing"}
              aria-hidden={activeShortcutGroup.id !== "default-text"}
            >
              <div
                className="app-rail-spacer"
                aria-hidden="true"
              />
            </div>
            <div
              className="app-rail-mode-group app-rail-mode-group-table"
              data-state={activeShortcutGroup.id === "table-editing" ? "open" : "closing"}
              aria-hidden={activeShortcutGroup.id !== "table-editing"}
            >
              <div className="table-tool-strip" data-fishmark-region="table-tool-strip">
                {tableToolActions.map((action) => {
                  const Icon = action.icon;
                  const isTooltipVisible = activeTableToolId === action.id;

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="table-tool-button"
                      data-tone={action.tone}
                      data-fishmark-region="table-tool-button"
                      aria-label={action.label}
                      onClick={action.onClick}
                      onMouseEnter={() => onTableToolHoverChange(action.id)}
                      onMouseLeave={() => onTableToolHoverChange(null)}
                      onFocus={() => onTableToolHoverChange(action.id)}
                      onBlur={() => onTableToolHoverChange(null)}
                    >
                      <Icon className="table-tool-button-icon" />
                      {isTooltipVisible ? (
                        <span
                          className="table-tool-tooltip"
                          data-fishmark-region="table-tool-tooltip"
                          role="tooltip"
                        >
                          {action.label}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="settings-entry"
            ref={settingsEntryRef}
            onMouseDown={onCaptureSettingsOpenOrigin}
            onClick={onSettingsOpen}
            aria-label="打开偏好设置"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M19.14 12.94a7.94 7.94 0 0 0 .05-.94 7.94 7.94 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.9 7.9 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.94 7.94 0 0 0 0 1.88L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.9 7.9 0 0 0 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="2.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            <span>设置</span>
          </button>
        </aside>

        <div
          className="app-workspace"
          data-fishmark-layout="workspace"
          data-fishmark-shell-mode={shellMode}
          data-fishmark-has-document={isDocumentOpen ? "true" : "false"}
          onMouseDownCapture={onAppWorkspaceMouseDownCapture}
        >
          {notification && notificationState !== "hidden" ? (
            <div
              className={`app-notification-banner is-${notification.kind}`}
              data-fishmark-region="app-notification-banner"
              data-state={notificationState}
              role="status"
              aria-live="polite"
            >
              <p className="app-notification-message">
                {notification.kind === "loading" ? (
                  <span
                    className="app-notification-spinner"
                    data-fishmark-region="app-notification-spinner"
                    aria-hidden="true"
                  />
                ) : null}
                <span>{notification.message}</span>
              </p>
            </div>
          ) : null}
          {externalFileState.status !== "idle" ? (
            <section
              className="external-file-conflict-banner"
              data-fishmark-region="external-file-conflict-banner"
              data-status={externalFileState.status}
              role="status"
              aria-live="polite"
            >
              <p className="external-file-conflict-message">{externalFileConflictMessage}</p>
              <div className="external-file-conflict-actions">
                <button
                  type="button"
                  className="external-file-conflict-button"
                  onClick={onReloadExternalFile}
                >
                  重载磁盘版本
                </button>
                {externalFileState.status === "pending" ? (
                  <button
                    type="button"
                    className="external-file-conflict-button"
                    onClick={onKeepMemoryVersion}
                  >
                    保留当前编辑
                  </button>
                ) : null}
                <button
                  type="button"
                  className="external-file-conflict-button"
                  onClick={onSaveAs}
                >
                  另存为新文件
                </button>
                {externalFileState.status === "keeping-memory" ? (
                  <button
                    type="button"
                    className="external-file-conflict-button is-secondary"
                    onClick={onDismissExternalFileConflict}
                  >
                    关闭提示
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
          {workspaceTabs.length > 0 ? (
            <nav
              className="workspace-tab-strip"
              data-fishmark-region="workspace-tab-strip"
              data-visibility={isReadingMode && isDocumentOpen ? "collapsed" : "visible"}
              aria-label="Open documents"
            >
              <div className="workspace-tab-strip-scroll">
                {workspaceTabs.map((tab, index) => {
                  const isActive = tab.tabId === activeTabId;
                  const tooltip = tab.path ?? tab.name;

                  return (
                    <div
                      key={tab.tabId}
                      className={`workspace-tab-shell ${isActive ? "is-active" : ""}`}
                      data-fishmark-region="workspace-tab-shell"
                      data-active={isActive ? "true" : "false"}
                      data-dirty={tab.isDirty ? "true" : "false"}
                    >
                      <button
                        type="button"
                        className={`workspace-tab ${isActive ? "is-active" : ""}`}
                        data-fishmark-region="workspace-tab"
                        data-active={isActive ? "true" : "false"}
                        data-dirty={tab.isDirty ? "true" : "false"}
                        title={tooltip}
                        draggable
                        onClick={() => onTabActivate(tab.tabId)}
                        onAuxClick={(event) => {
                          if (event.button === 1) {
                            event.preventDefault();
                            event.stopPropagation();
                            onCloseWorkspaceTab(tab.tabId);
                          }
                        }}
                        onDragStart={(event) => onTabDragStart(tab.tabId, event)}
                        onDragOver={onTabDragOver}
                        onDrop={(event) => onTabDrop(tab.tabId, index, event)}
                        onDragEnd={() => onTabDragEnd(tab.tabId)}
                      >
                        <span className="workspace-tab-label">{tab.name}</span>
                        <span
                          className="workspace-tab-dirty-indicator"
                          data-visibility={tab.isDirty ? "visible" : "hidden"}
                          aria-hidden="true"
                        >
                          •
                        </span>
                      </button>
                      <button
                        type="button"
                        className="workspace-tab-close"
                        data-fishmark-region="workspace-tab-close"
                        aria-label={`Close ${tab.name}`}
                        title={`Close ${tab.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseWorkspaceTab(tab.tabId);
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M3 3 L9 9 M9 3 L3 9"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </nav>
          ) : null}
          <header
            className="app-header workspace-header"
            data-fishmark-region="workspace-header"
            data-fishmark-surface="workspace-header"
            data-visibility={isReadingMode ? "collapsed" : "visible"}
          >
            <div className="workspace-title-group">
              <p className="workspace-kicker">{headerEyebrow}</p>
              <h1 className="workspace-title">{headerTitle}</h1>
              <p className="workspace-detail">{headerDetail}</p>
            </div>
            {!isDocumentOpen ? <p className="app-hint">{hintText}</p> : null}
          </header>

          <section
            className={`workspace-canvas ${activeDocument ? "is-editor-open" : ""}`}
            data-fishmark-region="workspace-canvas"
            data-fishmark-shell-mode={shellMode}
            data-fishmark-has-document={isDocumentOpen ? "true" : "false"}
          >
            {activeDocument ? (
              <>
                <div
                  data-fishmark-region="shortcut-hint-overlay-shell"
                  className="shortcut-hint-overlay-shell"
                  data-shortcut-hint-state={isShortcutHintVisible ? "visible" : "hidden"}
                >
                  <ShortcutHintOverlay
                    visible={isShortcutHintVisible}
                    platform={fishmarkPlatform}
                    group={activeShortcutGroup}
                  />
                </div>
                <section className={`workspace-shell ${isOutlineOpen ? "is-outline-open" : ""}`}>
                  <div
                    className="document-canvas"
                    ref={editorContainerRef}
                  >
                    <CodeEditorView
                      ref={editorRef}
                      initialContent={activeDocument.content}
                      documentPath={activeDocument.path}
                      loadRevision={editorLoadRevision}
                      importClipboardImage={onImportClipboardImage}
                      onActiveBlockChange={onActiveBlockChange}
                      onChange={onDraftChange}
                      onBlur={onEditorBlur}
                    />
                  </div>
                  {isOutlinePanelVisible ? (
                    <aside
                      className="outline-panel"
                      data-fishmark-region="outline-panel"
                      data-state={isOutlineOpen ? "open" : "closing"}
                      aria-label="Document outline"
                    >
                      <div
                        className="outline-panel-header"
                        data-fishmark-region="outline-panel-header"
                      >
                        <p className="outline-panel-title">Outline</p>
                        <button
                          type="button"
                          className="outline-panel-close"
                          aria-label="Collapse outline"
                          onClick={onCloseOutlinePanel}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="M9 6l6 6-6 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <div
                        className="outline-panel-body"
                        data-fishmark-region="outline-panel-body"
                      >
                        {outlineItems.length > 0 ? (
                          <ol className="outline-panel-list">
                            {outlineItems.map((item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  className={`outline-panel-item ${activeHeadingId === item.id ? "is-current" : ""}`}
                                  style={{
                                    paddingInlineStart: `${10 + Math.max(item.depth - 1, 0) * 10}px`
                                  }}
                                  onClick={() => onNavigateToOutlineItem(item.startOffset)}
                                >
                                  <span className="outline-panel-item-label">{item.label}</span>
                                </button>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="outline-panel-empty">No headings yet.</p>
                        )}
                      </div>
                    </aside>
                  ) : (
                    <button
                      type="button"
                      className="outline-entry"
                      data-fishmark-region="outline-toggle"
                      aria-label="Expand outline"
                      onClick={onOpenOutlinePanel}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M15 6l-6 6 6 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </section>
              </>
            ) : (
              <section
                className="empty-workspace"
                data-fishmark-region="empty-state"
              >
                <div className="empty-inner">
                  <svg
                    className="empty-mark"
                    aria-hidden="true"
                    width="48"
                    height="48"
                    viewBox="0 0 600 600"
                  >
                    <g transform="translate(0,600) scale(0.1,-0.1)" fill="currentColor">
                      <path d="M2850 5983 c-393 -37 -629 -87 -890 -190 -719 -283 -1291 -812 -1630 -1508 -306 -628 -378 -1311 -210 -1980 159 -632 539 -1216 1055 -1619 370 -289 810 -496 1246 -585 208 -43 336 -55 584 -55 256 0 364 11 600 60 961 203 1795 909 2154 1824 349 889 260 1829 -249 2651 -198 320 -511 650 -826 871 -371 261 -809 437 -1251 503 -200 30 -443 42 -583 28z m914 -1938 c167 -29 307 -93 314 -144 5 -33 -21 -56 -91 -82 -84 -30 -161 -70 -228 -116 -66 -45 -144 -111 -138 -117 2 -2 41 -26 86 -54 97 -59 209 -141 314 -229 43 -34 80 -63 84 -63 4 0 64 35 133 78 168 105 402 238 479 274 51 24 65 27 83 18 18 -9 21 -18 16 -41 -3 -16 -62 -149 -131 -295 -69 -145 -125 -269 -125 -275 0 -5 38 -81 84 -167 182 -342 193 -374 131 -380 -35 -3 -202 93 -502 290 l-184 121 -31 -23 c-183 -135 -325 -229 -462 -305 l-69 -38 29 -24 c16 -13 71 -44 123 -71 51 -26 100 -57 108 -68 43 -66 -68 -135 -308 -194 -215 -52 -316 -65 -534 -64 -217 0 -297 10 -504 64 -488 127 -1001 482 -1220 843 l-23 38 40 52 c276 363 695 633 1147 740 121 29 333 57 435 57 59 0 75 6 181 59 178 89 346 128 560 130 64 1 156 -6 203 -14z" />
                      <path d="M2490 3503 c-73 -7 -236 -46 -319 -75 -110 -39 -225 -96 -328 -165 -84 -56 -283 -228 -291 -251 -7 -23 206 -223 320 -299 251 -168 460 -231 733 -220 231 9 409 60 670 192 207 104 571 336 582 372 6 18 -228 168 -388 247 -285 142 -543 207 -802 204 -78 0 -158 -3 -177 -5z m-344 -332 c31 -19 64 -74 64 -108 0 -10 -9 -36 -19 -59 -31 -68 -114 -94 -178 -54 -64 39 -84 111 -49 178 31 60 120 81 182 43z" />
                    </g>
                  </svg>
                  <p className="empty-kicker">FishMark</p>
                  <h1>Your writing space<br />is ready.</h1>
                  <p className="empty-copy">
                    Open a Markdown file to begin. Edits are written back without reformatting.
                  </p>
                  <p className="empty-meta">⌘ O · Ctrl O</p>
                </div>
              </section>
            )}
          </section>

          <footer
            className="app-status-bar"
            data-fishmark-region="app-status-bar"
            data-visibility={isReadingMode && isDocumentOpen ? "collapsed" : "visible"}
          >
            <div data-fishmark-region="status-strip">
              {isDocumentOpen ? (
                <>
                  {appUpdateStatusLabel ? (
                    <p className="app-update-status">{appUpdateStatusLabel}</p>
                  ) : null}
                  <p
                    className={`save-status ${activeDocument?.isDirty ? "is-dirty" : "is-clean"}`}
                  >
                    {saveStatusLabel}
                  </p>
                  <p className="document-word-count">
                    字数 {currentDocumentMetrics?.meaningfulCharacterCount ?? 0}
                  </p>
                </>
              ) : (
                <>
                  <p className="app-version-label">{appVersionLabel}</p>
                  {appUpdateStatusLabel ? (
                    <p className="app-update-status">{appUpdateStatusLabel}</p>
                  ) : null}
                </>
              )}
            </div>
          </footer>
        </div>
      </div>

      {isSettingsDrawerVisible ? (
        <div
          data-fishmark-dialog="settings-drawer"
          data-fishmark-overlay-style="floating-drawer"
          data-state={isSettingsOpen ? "open" : "closing"}
          onClick={onCloseSettingsDrawer}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <Suspense
              fallback={
                <SettingsDrawerFallback surfaceState={isSettingsOpen ? "open" : "closing"} />
              }
            >
              <SettingsView
                surfaceState={isSettingsOpen ? "open" : "closing"}
                preferences={preferences}
                fontFamilies={fontFamilies}
                themePackages={themePackages}
                isRefreshingThemes={isRefreshingThemePackages}
                onRefreshThemes={onRefreshThemePackages}
                onUpdate={onUpdatePreferences}
                onClose={onCloseSettingsDrawer}
              />
            </Suspense>
          </div>
        </div>
      ) : null}
    </main>
  );
}
