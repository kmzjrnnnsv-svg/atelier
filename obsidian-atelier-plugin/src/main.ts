import { Plugin, Notice } from "obsidian";
import { AtelierAPI, AtelierSettings, DEFAULT_SETTINGS } from "./api";
import { AtelierSync } from "./sync";
import { AtelierSettingTab } from "./settings";

export default class AtelierPlugin extends Plugin {
  settings: AtelierSettings = DEFAULT_SETTINGS;
  api: AtelierAPI = new AtelierAPI(DEFAULT_SETTINGS);
  sync: AtelierSync | null = null;
  private autoSyncInterval: number | null = null;

  async onload() {
    await this.loadSettings();

    this.api = new AtelierAPI(this.settings);
    this.sync = new AtelierSync(this.app, this.api, this.settings.syncFolder);

    this.addSettingTab(new AtelierSettingTab(this.app, this));

    this.addCommand({
      id: "atelier-sync",
      name: "Alle Daten synchronisieren",
      callback: () => this.runSync(),
    });

    this.addCommand({
      id: "atelier-sync-scans",
      name: "Nur Fußscans synchronisieren",
      callback: async () => {
        try {
          await this.sync?.syncScans();
          new Notice("Atelier: Scans synchronisiert!");
        } catch (e: any) {
          new Notice(`Fehler: ${e.message}`);
        }
      },
    });

    this.addCommand({
      id: "atelier-sync-orders",
      name: "Nur Bestellungen synchronisieren",
      callback: async () => {
        try {
          await this.sync?.syncOrders();
          new Notice("Atelier: Bestellungen synchronisiert!");
        } catch (e: any) {
          new Notice(`Fehler: ${e.message}`);
        }
      },
    });

    this.addCommand({
      id: "atelier-sync-shoes",
      name: "Nur Schuhe synchronisieren",
      callback: async () => {
        try {
          await this.sync?.syncShoes();
          new Notice("Atelier: Schuhe synchronisiert!");
        } catch (e: any) {
          new Notice(`Fehler: ${e.message}`);
        }
      },
    });

    this.addCommand({
      id: "atelier-sync-articles",
      name: "Nur Artikel synchronisieren",
      callback: async () => {
        try {
          await this.sync?.syncArticles();
          new Notice("Atelier: Artikel synchronisiert!");
        } catch (e: any) {
          new Notice(`Fehler: ${e.message}`);
        }
      },
    });

    this.addCommand({
      id: "atelier-open-dashboard",
      name: "Dashboard ffnen",
      callback: async () => {
        const path = `${this.settings.syncFolder}/Dashboard.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file) {
          await this.app.workspace.openLinkText(path, "", false);
        } else {
          new Notice("Dashboard nicht gefunden. Bitte zuerst synchronisieren.");
        }
      },
    });

    this.addRibbonIcon("database", "Atelier Sync", () => this.runSync());

    this.setupAutoSync();

    console.log("Atelier Plugin geladen");
  }

  onunload() {
    if (this.autoSyncInterval) {
      window.clearInterval(this.autoSyncInterval);
    }
    console.log("Atelier Plugin entladen");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.api.updateSettings(this.settings);
    this.sync?.updateBaseFolder(this.settings.syncFolder);
  }

  setupAutoSync() {
    if (this.autoSyncInterval) {
      window.clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    if (this.settings.autoSyncMinutes > 0) {
      this.autoSyncInterval = window.setInterval(
        () => this.runSync(),
        this.settings.autoSyncMinutes * 60 * 1000
      );
    }
  }

  async runSync() {
    if (!this.settings.email || !this.settings.password) {
      new Notice("Atelier: Bitte zuerst E-Mail und Passwort in den Einstellungen eingeben.");
      return;
    }
    try {
      await this.sync?.syncAll();
    } catch (e: any) {
      console.error("Atelier sync error:", e);
    }
  }
}
