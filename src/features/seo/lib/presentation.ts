import type { ConnectorState, OpportunityAction, OpportunityStatus, PriorityBand } from "@/features/seo/types";

export type BadgeTone = "violet" | "cyan" | "lime" | "amber" | "rose" | "slate";

export function actionTone(action: OpportunityAction): BadgeTone {
  switch (action) {
    case "refresh":
      return "cyan";
    case "new_support_page":
      return "violet";
    case "new_relevant_blog":
      return "amber";
    case "merge":
      return "rose";
    case "skip":
      return "slate";
  }
}

export function statusTone(status: OpportunityStatus): BadgeTone {
  switch (status) {
    case "approved":
      return "lime";
    case "in_review":
      return "amber";
    case "drafting":
      return "cyan";
    case "snoozed":
      return "slate";
    case "dismissed":
      return "rose";
    case "new":
      return "violet";
  }
}

export function priorityTone(priority: PriorityBand): BadgeTone {
  switch (priority) {
    case "do_now":
      return "amber";
    case "queue":
      return "violet";
    case "backlog":
      return "cyan";
    case "deferred":
      return "slate";
  }
}

export function connectorTone(status: ConnectorState): BadgeTone {
  switch (status) {
    case "connected":
      return "lime";
    case "attention":
      return "amber";
    case "planned":
      return "slate";
  }
}
