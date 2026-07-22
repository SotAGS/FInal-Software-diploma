import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

const puppeteerCacheDir = path.join(process.cwd(), ".cache", "puppeteer");

const obtenerPuppeteer = async () => {
  process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || puppeteerCacheDir;
  return import("puppeteer");
};

const existeArchivo = (ruta?: string): boolean => {
  return Boolean(ruta && fs.existsSync(ruta));
};

const resolverExecutablePath = async (puppeteer: any): Promise<string> => {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || puppeteerCacheDir;
  fs.mkdirSync(cacheDir, { recursive: true });

  const ejecutableConfigurado = String(process.env.PUPPETEER_EXECUTABLE_PATH || "").trim();
  if (ejecutableConfigurado && existeArchivo(ejecutableConfigurado)) {
    return ejecutableConfigurado;
  }

  let ejecutable = puppeteer.executablePath();
  if (existeArchivo(ejecutable)) {
    return ejecutable;
  }

  console.warn("[PDF] Chrome no encontrado, instalando navegador de Puppeteer...");

  try {
    execSync("npx puppeteer browsers install chrome", {
      stdio: "inherit",
      env: {
        ...process.env,
        PUPPETEER_CACHE_DIR: cacheDir
      }
    });
  } catch (error) {
    console.error("[PDF] No se pudo instalar Chrome de Puppeteer:", (error as any)?.message || error);
  }

  ejecutable = puppeteer.executablePath();
  if (existeArchivo(ejecutable)) {
    return ejecutable;
  }

  throw new Error(`Browser no encontrado en ruta esperada: ${ejecutable}`);
};

export type ReportePdfKey =
  | "desempenio-compras"
  | "rotacion-inventario"
  | "auditoria-accesos"
  | "productos-mas-vendidos"
  | "variacion-precios-compra"
  | "busqueda-ordenes-fecha"
  | "resumen-ventas-mensual";

const rutasReporte: Record<ReportePdfKey, string> = {
  "desempenio-compras": "/Reportes/desempenio-compras",
  "rotacion-inventario": "/Reportes/rotacion-inventario",
  "auditoria-accesos": "/Reportes/auditoria-accesos",
  "productos-mas-vendidos": "/Reportes/productos-mas-vendidos",
  "variacion-precios-compra": "/Reportes/variacion-precios-compra",
  "busqueda-ordenes-fecha": "/Reportes/busqueda-ordenes-fecha",
  "resumen-ventas-mensual": "/Reportes/resumen-ventas-mensual"
};

const slugSeguro = (valor: string): string => {
  return valor
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const obtenerCarpetaTemporalReportes = (): string => {
  const carpetaReportes = path.join(os.tmpdir(), "ReportesPDF");
  fs.mkdirSync(carpetaReportes, { recursive: true });

  return carpetaReportes;
};

const formatoTimestamp = (fecha: Date): string => {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  const ss = String(fecha.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
};

export const obtenerRutaReportePorKey = (reporte: ReportePdfKey): string => {
  return rutasReporte[reporte];
};

export const generarReportePdf = async (
  reporte: ReportePdfKey,
  cookieHeader: string | undefined,
  queryParams: Record<string, string | undefined> = {},
  baseUrlOverride?: string
): Promise<{ filePath: string; fileName: string; outputDir: string }> => {
  const outputDir = obtenerCarpetaTemporalReportes();
  const timestamp = formatoTimestamp(new Date());
  const fileName = `${slugSeguro(reporte)}-${timestamp}.pdf`;
  const filePath = path.join(outputDir, fileName);

  const baseUrl = process.env.APP_BASE_URL || baseUrlOverride || `http://localhost:${process.env.PORT || 3000}`;
  const url = new URL(obtenerRutaReportePorKey(reporte), baseUrl);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  });

  url.searchParams.set("pdf", "1");

  const puppeteerModule = await obtenerPuppeteer();
  const puppeteer = puppeteerModule.default;

  const executablePath = await resolverExecutablePath(puppeteer);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });

    if (page.url().includes("/login")) {
      throw new Error("No se pudo autenticar para generar el PDF del reporte");
    }

    await page.waitForFunction("window.__REPORT_READY__ === true", {
      timeout: 15000
    }).catch(() => undefined);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      landscape: false,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm"
      }
    });

    return { filePath, fileName, outputDir };
  } finally {
    await browser.close();
  }
};
