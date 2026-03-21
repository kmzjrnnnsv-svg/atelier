import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type AtelierPlugin from "./main";

export class AtelierSettingTab extends PluginSettingTab {
  plugin: AtelierPlugin;

  constructor(app: App, plugin: AtelierPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Atelier Einstellungen" });

    new Setting(containerEl)
      .setName("API URL")
      .setDesc("URL des Atelier-Backends (z.B. http://localhost:3001)")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:3001")
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("E-Mail")
      .setDesc("Login E-Mail-Adresse")
      .addText((text) =>
        text
          .setPlaceholder("admin@atelier.de")
          .setValue(this.plugin.settings.email)
          .onChange(async (value) => {
            this.plugin.settings.email = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Passwort")
      .setDesc("Login Passwort")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("********")
          .setValue(this.plugin.settings.password)
          .onChange(async (value) => {
            this.plugin.settings.password = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Sync-Ordner")
      .setDesc("Ordner im Vault, in dem Atelier-Daten gespeichert werden")
      .addText((text) =>
        text
          .setPlaceholder("Atelier")
          .setValue(this.plugin.settings.syncFolder)
          .onChange(async (value) => {
            this.plugin.settings.syncFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-Sync (Minuten)")
      .setDesc("Automatische Synchronisierung alle X Minuten (0 = deaktiviert)")
      .addText((text) =>
        text
          .setPlaceholder("0")
          .setValue(String(this.plugin.settings.autoSyncMinutes))
          .onChange(async (value) => {
            const num = parseInt(value) || 0;
            this.plugin.settings.autoSyncMinutes = num;
            await this.plugin.saveSettings();
            this.plugin.setupAutoSync();
          })
      );

    containerEl.createEl("h3", { text: "Aktionen" });

    new Setting(containerEl)
      .setName("Verbindung testen")
      .setDesc("Prft die Verbindung zum Atelier-Backend")
      .addButton((btn) =>
        btn.setButtonText("Testen").onClick(async () => {
          try {
            const health = await this.plugin.api.health();
            new Notice(`Verbindung OK! Server-Zeit: ${health.time}`);
          } catch (e: any) {
            new Notice(`Verbindungsfehler: ${e.message}`);
          }
        })
      );

    new Setting(containerEl)
      .setName("Login testen")
      .setDesc("Testet den Login mit den gespeicherten Zugangsdaten")
      .addButton((btn) =>
        btn.setButtonText("Login").onClick(async () => {
          try {
            await this.plugin.api.login();
            new Notice("Login erfolgreich!");
          } catch (e: any) {
            new Notice(`Login fehlgeschlagen: ${e.message}`);
          }
        })
      );

    new Setting(containerEl)
      .setName("Jetzt synchronisieren")
      .setDesc("Alle Daten vom Backend synchronisieren")
      .addButton((btn) =>
        btn
          .setButtonText("Sync starten")
          .setCta()
          .onClick(async () => {
            await this.plugin.runSync();
          })
      );
  }
}
