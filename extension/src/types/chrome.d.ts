/**
 * Minimal Chrome Extension Manifest V3 ambient types for Phase 5.
 */
declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: { id?: number; url?: string; title?: string };
      id?: string;
      url?: string;
    }

    const onMessage: {
      addListener(
        callback: (
          message: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ): void;
      removeListener(callback: (...args: any[]) => void): void;
    };

    function sendMessage(
      message: any,
      responseCallback?: (response: any) => void
    ): void;

    function getURL(path: string): string;
  }

  namespace tabs {
    function create(createProperties: { url: string; active?: boolean }): Promise<any>;
    function query(queryInfo: any, callback: (result: any[]) => void): void;
    function sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
  }

  namespace storage {
    interface StorageArea {
      get(keys?: any): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
    }
    const local: StorageArea;
    const sync: StorageArea;
  }
}
