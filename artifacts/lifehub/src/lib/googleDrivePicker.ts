declare global {
  interface Window {
    gapi?: { load: (name: string, opts: { callback: () => void; onerror: () => void }) => void };
    google?: any;
  }
}

let gapiLoadPromise: Promise<void> | null = null;

function loadGapiScript(): Promise<void> {
  if (window.gapi) return Promise.resolve();
  if (gapiLoadPromise) return gapiLoadPromise;
  gapiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar a API do Google."));
    document.body.appendChild(script);
  });
  return gapiLoadPromise;
}

let pickerLoadPromise: Promise<void> | null = null;

function loadPickerModule(): Promise<void> {
  if (window.google?.picker) return Promise.resolve();
  if (pickerLoadPromise) return pickerLoadPromise;
  pickerLoadPromise = new Promise((resolve, reject) => {
    window.gapi!.load("picker", { callback: resolve, onerror: () => reject(new Error("Não foi possível carregar o Google Picker.")) });
  });
  return pickerLoadPromise;
}

export interface DrivePickedFile {
  name: string;
  url: string;
}

export async function openDrivePicker(accessToken: string, apiKey: string): Promise<DrivePickedFile | null> {
  await loadGapiScript();
  await loadPickerModule();

  const google = window.google;
  return new Promise((resolve) => {
    const view = new google.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false);
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          resolve({ name: doc.name, url: doc.url });
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
