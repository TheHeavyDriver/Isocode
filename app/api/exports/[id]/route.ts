import { fail, requireApiRole } from "@/lib/http/api";
import { getExportDownload } from "@/lib/exports/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole(["desk", "admin"]);
    const { id } = await params;
    const record = await getExportDownload(session, id);
    const contentType =
      record.format === "tally_xml"
        ? "application/xml; charset=utf-8"
        : "text/csv; charset=utf-8";
    const safeName = record.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return new Response(record.content, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${safeName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
