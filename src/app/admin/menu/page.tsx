import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { AdminForm, Check, Field, Panel, Select, TextArea } from "@/components/admin/AdminForm";
import { requirePageRole } from "@/lib/auth";
import { mapProduct } from "@/lib/data/public";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

const AVAILABILITY = [
  { value: "coming_soon", label: "Served / on sale on event day" },
  { value: "available", label: "Available now" },
  { value: "sold_out", label: "Sold out" },
  { value: "hidden", label: "Hidden from the site" },
];

function ProductFields({ p }: { p?: Product }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" name="name" defaultValue={p?.name} required maxLength={80} />
        <Field label="Slug (used in links)" name="slug" defaultValue={p?.slug} required maxLength={60} hint="lowercase-with-dashes" />
        <Select
          label="Section"
          name="category"
          defaultValue={p?.category ?? "food"}
          options={[
            { value: "food", label: "To eat" },
            { value: "diyas", label: "Diwali diyas" },
          ]}
        />
        <Select label="Availability" name="availability" defaultValue={p?.availability ?? "coming_soon"} options={AVAILABILITY} />
        <Field label="Price in rupees" name="price" type="number" step="0.5" min={0} defaultValue={p?.pricePaise != null ? p.pricePaise / 100 : ""} hint="Leave empty to show 'Price to be announced'." />
        <Field label="Price note (optional)" name="price_note" defaultValue={p?.priceNote} maxLength={80} hint="For example: ₹30 each, 4 for ₹100" />
        <Field label="Tagline" name="tagline" defaultValue={p?.tagline} maxLength={80} />
        <Field label="Order on the page" name="sort_order" type="number" defaultValue={p?.sortOrder ?? 0} />
        <Field label="Featured label (optional)" name="featured_label" defaultValue={p?.featuredLabel} maxLength={30} />
        <Field label="Image alt text" name="image_alt" defaultValue={p?.imageAlt} maxLength={200} hint="Describe the photo for screen readers." />
      </div>
      <TextArea label="Description" name="description" defaultValue={p?.description} hint="No ingredient or allergy claims unless they are checked." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Upload a photo" name="image" type="file" accept="image/webp,image/jpeg,image/png,image/avif" hint="WebP, JPEG, PNG or AVIF, up to 5 MB." />
        <Field label="…or image URL" name="image_url" defaultValue={p?.imageUrl} />
      </div>
      <div className="flex flex-wrap gap-6">
        <Check name="featured" label="Featured" defaultChecked={p?.featured} />
        <Check name="image_is_illustrative" label="Image is illustrative, not a real photo" defaultChecked={p?.imageIsIllustrative ?? true} />
      </div>
    </>
  );
}

export default async function AdminMenuPage() {
  const session = await requirePageRole("admin", "/admin/menu");
  const { data } = await session.supabase.from("products").select("*").order("category").order("sort_order");
  const products = (data ?? []).map(mapProduct);

  return (
    <div className="flex flex-col gap-8">
      {products.map((p) => (
        <Panel key={p.id} title={`${p.name} · ${formatPrice(p.pricePaise, p.priceNote)}`}>
          <AdminForm action={saveProduct} submitLabel="Save item">
            <ProductFields p={p} />
          </AdminForm>
          <AdminForm action={deleteProduct} submitLabel="Delete item" variant="outline" className="mt-4" confirmText={`Delete ${p.name}? This cannot be undone.`}>
            <input type="hidden" name="id" value={p.id} />
          </AdminForm>
        </Panel>
      ))}
      <Panel title="Add an item">
        <AdminForm action={saveProduct} submitLabel="Add item">
          <ProductFields />
        </AdminForm>
      </Panel>
    </div>
  );
}
