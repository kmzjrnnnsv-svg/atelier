import { App, TFolder, Notice } from "obsidian";
import { AtelierAPI } from "./api";

export class AtelierSync {
  private app: App;
  private api: AtelierAPI;
  private baseFolder: string;

  constructor(app: App, api: AtelierAPI, baseFolder: string) {
    this.app = app;
    this.api = api;
    this.baseFolder = baseFolder;
  }

  updateBaseFolder(folder: string) {
    this.baseFolder = folder;
  }

  private path(sub: string, file: string): string {
    return `${this.baseFolder}/${sub}/${file}.md`;
  }

  private async ensureFolder(sub: string): Promise<void> {
    const folderPath = `${this.baseFolder}/${sub}`;
    const existing = this.app.vault.getAbstractFileByPath(folderPath);
    if (!existing) {
      await this.app.vault.createFolder(folderPath);
    }
  }

  private async writeFile(sub: string, name: string, content: string): Promise<void> {
    await this.ensureFolder(sub);
    const filePath = this.path(sub, name);
    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing) {
      await this.app.vault.modify(existing as any, content);
    } else {
      await this.app.vault.create(filePath, content);
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_").trim();
  }

  async syncAll(): Promise<void> {
    const notice = new Notice("Atelier: Synchronisiere...", 0);
    let synced = 0;
    try {
      await this.syncUsers();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncScans();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncOrders();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncShoes();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncArticles();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncFaqs();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncMaterials();
      synced++;
      notice.setMessage(`Atelier: ${synced}/8 synchronisiert...`);

      await this.syncDashboard();
      synced++;

      notice.hide();
      new Notice("Atelier: Sync abgeschlossen!");
    } catch (e: any) {
      notice.hide();
      new Notice(`Atelier Sync-Fehler: ${e.message}`);
      throw e;
    }
  }

  async syncUsers(): Promise<void> {
    try {
      const users = await this.api.getUsers();
      for (const user of users) {
        const content = this.userToMarkdown(user);
        await this.writeFile("Kunden", this.sanitizeName(user.name || `User_${user.id}`), content);
      }
    } catch {
      // Non-admin users can't list all users - sync own profile
      const me = await this.api.getMe();
      await this.writeFile("Kunden", this.sanitizeName(me.name || "Ich"), this.userToMarkdown(me));
    }
  }

  private userToMarkdown(user: any): string {
    return [
      "---",
      `id: ${user.id}`,
      `name: "${user.name || ""}"`,
      `email: "${user.email || ""}"`,
      `rolle: "${user.role || "user"}"`,
      `aktiv: ${user.is_active !== undefined ? user.is_active : true}`,
      `erstellt: "${user.created_at || ""}"`,
      "tags: [atelier, kunde]",
      "---",
      "",
      `# ${user.name || "Benutzer"}`,
      "",
      `- **E-Mail:** ${user.email}`,
      `- **Rolle:** ${user.role || "user"}`,
      `- **Erstellt:** ${user.created_at || ""}`,
      user.foot_notes ? `\n## Fußnotizen\n\n${user.foot_notes}` : "",
    ].join("\n");
  }

  async syncScans(): Promise<void> {
    let scans: any[];
    try {
      scans = await this.api.getAllScans();
    } catch {
      scans = await this.api.getMyScans();
    }
    for (const scan of scans) {
      const name = this.sanitizeName(
        `Scan_${scan.id}_${scan.side || "unbekannt"}_${(scan.created_at || "").split("T")[0]}`
      );
      await this.writeFile("Scans", name, this.scanToMarkdown(scan));
    }
  }

  private scanToMarkdown(scan: any): string {
    const lines = [
      "---",
      `id: ${scan.id}`,
      `seite: "${scan.side || ""}"`,
      `user_id: ${scan.user_id || ""}`,
    ];
    if (scan.foot_length) lines.push(`fusslaenge: ${scan.foot_length}`);
    if (scan.foot_width) lines.push(`fussbreite: ${scan.foot_width}`);
    if (scan.arch_height) lines.push(`risthoehe: ${scan.arch_height}`);
    if (scan.accuracy_score) lines.push(`genauigkeit: ${scan.accuracy_score}`);
    lines.push(
      `erstellt: "${scan.created_at || ""}"`,
      "tags: [atelier, scan]",
      "---",
      "",
      `# Fußscan #${scan.id} (${scan.side || "?"})`,
      ""
    );

    if (scan.user_name) lines.push(`**Kunde:** ${scan.user_name}`);
    lines.push(
      "",
      "## Messungen",
      "",
      `| Messung | Wert |`,
      `|---------|------|`
    );

    const fields: [string, string][] = [
      ["Fußlänge", "foot_length"],
      ["Fußbreite", "foot_width"],
      ["Risthöhe", "arch_height"],
      ["Ballumfang", "ball_girth"],
      ["Spannumfang", "instep_girth"],
      ["Fersenumfang", "heel_girth"],
      ["Wadenumfang", "calf_girth"],
      ["Knöchelumfang", "ankle_girth"],
      ["Genauigkeit", "accuracy_score"],
    ];

    for (const [label, key] of fields) {
      if (scan[key] !== undefined && scan[key] !== null) {
        const val = typeof scan[key] === "number" ? scan[key].toFixed(1) : scan[key];
        lines.push(`| ${label} | ${val} mm |`);
      }
    }

    if (scan.notes) {
      lines.push("", "## Notizen", "", scan.notes);
    }

    return lines.join("\n");
  }

  async syncOrders(): Promise<void> {
    let orders: any[];
    try {
      orders = await this.api.getAllOrders();
    } catch {
      orders = await this.api.getMyOrders();
    }
    for (const order of orders) {
      const name = this.sanitizeName(
        `Bestellung_${order.id}_${(order.created_at || "").split("T")[0]}`
      );
      await this.writeFile("Bestellungen", name, this.orderToMarkdown(order));
    }
  }

  private orderToMarkdown(order: any): string {
    const lines = [
      "---",
      `id: ${order.id}`,
      `status: "${order.status || ""}"`,
      `user_id: ${order.user_id || ""}`,
      `erstellt: "${order.created_at || ""}"`,
      "tags: [atelier, bestellung]",
      "---",
      "",
      `# Bestellung #${order.id}`,
      "",
      `- **Status:** ${order.status || "offen"}`,
      `- **Erstellt:** ${order.created_at || ""}`,
    ];

    if (order.user_name) lines.push(`- **Kunde:** ${order.user_name}`);
    if (order.user_email) lines.push(`- **E-Mail:** ${order.user_email}`);
    if (order.total) lines.push(`- **Gesamt:** ${order.total} EUR`);

    if (order.delivery_name) {
      lines.push(
        "",
        "## Lieferadresse",
        "",
        `${order.delivery_name}`,
        `${order.delivery_street || ""}`,
        `${order.delivery_zip || ""} ${order.delivery_city || ""}`,
        `${order.delivery_country || ""}`
      );
    }

    if (order.shoe_config) {
      lines.push("", "## Schuh-Konfiguration", "");
      try {
        const config = typeof order.shoe_config === "string" ? JSON.parse(order.shoe_config) : order.shoe_config;
        for (const [k, v] of Object.entries(config)) {
          lines.push(`- **${k}:** ${v}`);
        }
      } catch {
        lines.push(String(order.shoe_config));
      }
    }

    if (order.foot_notes_en) {
      lines.push("", "## Fußnotizen (EN)", "", order.foot_notes_en);
    }

    return lines.join("\n");
  }

  async syncShoes(): Promise<void> {
    const shoes = await this.api.getShoes();
    for (const shoe of shoes) {
      const name = this.sanitizeName(shoe.name || `Schuh_${shoe.id}`);
      await this.writeFile("Schuhe", name, this.shoeToMarkdown(shoe));
    }
  }

  private shoeToMarkdown(shoe: any): string {
    const lines = [
      "---",
      `id: ${shoe.id}`,
      `name: "${shoe.name || ""}"`,
      `preis: ${shoe.price || 0}`,
      `material: "${shoe.material || ""}"`,
      `farbe: "${shoe.color || ""}"`,
      "tags: [atelier, schuh]",
      "---",
      "",
      `# ${shoe.name || "Schuh"}`,
      "",
      `- **Preis:** ${shoe.price || 0} EUR`,
      `- **Material:** ${shoe.material || ""}`,
      `- **Farbe:** ${shoe.color || ""}`,
    ];

    if (shoe.description) lines.push("", "## Beschreibung", "", shoe.description);

    return lines.join("\n");
  }

  async syncArticles(): Promise<void> {
    const articles = await this.api.getArticles();
    for (const article of articles) {
      const name = this.sanitizeName(article.title || `Artikel_${article.id}`);
      await this.writeFile("Artikel", name, this.articleToMarkdown(article));
    }
  }

  private articleToMarkdown(article: any): string {
    return [
      "---",
      `id: ${article.id}`,
      `titel: "${(article.title || "").replace(/"/g, '\\"')}"`,
      `kategorie: "${article.category || ""}"`,
      `publiziert: ${article.published || false}`,
      `erstellt: "${article.created_at || ""}"`,
      "tags: [atelier, artikel]",
      "---",
      "",
      `# ${article.title || "Artikel"}`,
      "",
      article.content || "",
    ].join("\n");
  }

  async syncFaqs(): Promise<void> {
    const faqs = await this.api.getFaqs();
    for (const faq of faqs) {
      const name = this.sanitizeName(`FAQ_${faq.id}_${(faq.question || "").slice(0, 40)}`);
      await this.writeFile("FAQs", name, this.faqToMarkdown(faq));
    }
  }

  private faqToMarkdown(faq: any): string {
    return [
      "---",
      `id: ${faq.id}`,
      `frage: "${(faq.question || "").replace(/"/g, '\\"')}"`,
      "tags: [atelier, faq]",
      "---",
      "",
      `## ${faq.question || "FAQ"}`,
      "",
      faq.answer || "",
    ].join("\n");
  }

  async syncMaterials(): Promise<void> {
    try {
      const [materials, colors, soles] = await Promise.all([
        this.api.getMaterials().catch(() => []),
        this.api.getColors().catch(() => []),
        this.api.getSoles().catch(() => []),
      ]);

      const lines = [
        "---",
        "tags: [atelier, materialien]",
        "---",
        "",
        "# Materialien & Optionen",
        "",
      ];

      if (materials.length) {
        lines.push("## Materialien", "", "| Name | Beschreibung |", "|------|-------------|");
        for (const m of materials) {
          lines.push(`| ${m.name || ""} | ${m.description || ""} |`);
        }
        lines.push("");
      }

      if (colors.length) {
        lines.push("## Farben", "", "| Name | Hex |", "|------|-----|");
        for (const c of colors) {
          lines.push(`| ${c.name || ""} | ${c.hex || ""} |`);
        }
        lines.push("");
      }

      if (soles.length) {
        lines.push("## Sohlen", "", "| Name | Beschreibung |", "|------|-------------|");
        for (const s of soles) {
          lines.push(`| ${s.name || ""} | ${s.description || ""} |`);
        }
      }

      await this.writeFile("", "Materialien", lines.join("\n"));
    } catch {
      // optional, skip if no access
    }
  }

  async syncDashboard(): Promise<void> {
    let userCount = "?";
    let scanCount = "?";
    let orderCount = "?";
    let shoeCount = "?";

    try {
      const users = await this.api.getUsers();
      userCount = String(users.length);
    } catch {}

    try {
      let scans: any[];
      try {
        scans = await this.api.getAllScans();
      } catch {
        scans = await this.api.getMyScans();
      }
      scanCount = String(scans.length);
    } catch {}

    try {
      let orders: any[];
      try {
        orders = await this.api.getAllOrders();
      } catch {
        orders = await this.api.getMyOrders();
      }
      orderCount = String(orders.length);
    } catch {}

    try {
      const shoes = await this.api.getShoes();
      shoeCount = String(shoes.length);
    } catch {}

    const now = new Date().toISOString();
    const content = [
      "---",
      "tags: [atelier, dashboard]",
      "---",
      "",
      "# Atelier Dashboard",
      "",
      `> Letzte Synchronisierung: ${now}`,
      "",
      "## Statistiken",
      "",
      `| Kategorie | Anzahl |`,
      `|-----------|--------|`,
      `| Kunden | ${userCount} |`,
      `| Fußscans | ${scanCount} |`,
      `| Bestellungen | ${orderCount} |`,
      `| Schuhe | ${shoeCount} |`,
      "",
      "## Ordner",
      "",
      `- [[${this.baseFolder}/Kunden|Kunden]]`,
      `- [[${this.baseFolder}/Scans|Scans]]`,
      `- [[${this.baseFolder}/Bestellungen|Bestellungen]]`,
      `- [[${this.baseFolder}/Schuhe|Schuhe]]`,
      `- [[${this.baseFolder}/Artikel|Artikel]]`,
      `- [[${this.baseFolder}/FAQs|FAQs]]`,
      `- [[${this.baseFolder}/Materialien|Materialien]]`,
    ].join("\n");

    await this.writeFile("", "Dashboard", content);
  }
}
