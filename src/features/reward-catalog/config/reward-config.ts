import { Gift } from "lucide-react";
import type { ServerTableConfig } from "@/features/reference-data/shared/types/server-table-types";

export const rewardConfig: ServerTableConfig = {
  modelName: "RewardPolicy",
  endpoint: "rewardpolicies",
  pageTitle: "Rewards Catalog",
  singularTitle: "Reward",
  pageIcon: Gift,
  testIdPrefix: "rewards",
  defaultSort: "name",
  populate: ["createdBy", "updatedBy"],
  searchFields: ["name", "desc", "ext.rewardType", "ext.programCode"],
  coreColumns: [
    { field: "image", label: "Image", type: "text", cellRenderer: "image", defaultVisible: true, filterable: false },
    { field: "name", label: "Reward", type: "text", cellRenderer: "reward-name", defaultVisible: true },
    { field: "status", label: "Status", type: "text", cellRenderer: "reward-status", defaultVisible: true, filterable: false },
    { field: "cost", label: "Cost", type: "number" },
    { field: "effectiveDate", label: "Start Date", type: "date" },
    { field: "expirationDate", label: "End Date", type: "date" },
    { field: "redemptions", label: "Redemptions", type: "number" },
    { field: "availableRedemptions", label: "Available", type: "number" },
    { field: "countLimit", label: "Total Cap", type: "number" },
    { field: "perDayLimit", label: "Per-Day Limit", type: "number" },
    { field: "perWeekLimit", label: "Per-Week Limit", type: "number" },
    { field: "perOfferLimit", label: "Per-Offer Limit", type: "number" },
    { field: "transactionLimit", label: "Per-Txn Usage Limit", type: "number" },
    { field: "coolOffPeriod", label: "Cool-Off (min)", type: "number" },
    { field: "numUses", label: "Uses/Issuance", type: "number" },
    { field: "canPreview", label: "Previewable", type: "boolean" },
    { field: "ext._meta.eligibleChannels", label: "Channels", type: "text", cellRenderer: "reward-channels", filterable: false },
    { field: "createdAt", label: "Created At", type: "date" },
    { field: "updatedAt", label: "Updated At", type: "date" },
    { field: "createdBy", label: "Created By", type: "text", cellRenderer: "user" },
    { field: "updatedBy", label: "Updated By", type: "text", cellRenderer: "user" },
  ],
  coreFormFields: [], // Reward uses custom RewardFormDrawer, not EntityFormDrawer
};
