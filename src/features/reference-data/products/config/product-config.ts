import { Package } from "lucide-react";
import type { ServerTableConfig } from "../../shared/types/server-table-types";

export const productConfig: ServerTableConfig = {
  modelName: "Product",
  endpoint: "products",
  pageTitle: "Products",
  pageIcon: Package,
  testIdPrefix: "products",
  defaultSort: "name",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["name", "sku", "category", "upc"],

  coreColumns: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "sku", label: "SKU", type: "text" },
    { field: "category", label: "Category", type: "text" },
    { field: "subcategory", label: "Subcategory", type: "text" },
    { field: "cost", label: "Cost", type: "number" },
    { field: "effectiveDate", label: "Effective Date", type: "date", defaultVisible: false },
    { field: "expirationDate", label: "Expiration Date", type: "date", defaultVisible: false },
    { field: "createdAt", label: "Created At", type: "date", defaultVisible: false },
    { field: "updatedAt", label: "Updated At", type: "date", defaultVisible: false },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user", defaultVisible: false },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user", defaultVisible: false },
  ],

  coreFormFields: [
    { field: "name", label: "Name", type: "text", required: true },
    { field: "sku", label: "SKU", type: "text", required: true },
    { field: "desc", label: "Description", type: "textarea" },
    { field: "cost", label: "Cost", type: "number" },
    { field: "category", label: "Category", type: "text" },
    { field: "subcategory", label: "Subcategory", type: "text" },
    { field: "style", label: "Style", type: "text" },
    { field: "internalCode", label: "Internal Code", type: "text" },
    { field: "upc", label: "UPC", type: "text" },
    { field: "url", label: "URL", type: "text" },
    { field: "effectiveDate", label: "Effective Date", type: "date" },
    { field: "expirationDate", label: "Expiration Date", type: "date" },
  ],
};
