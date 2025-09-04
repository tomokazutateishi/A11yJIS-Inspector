export type IssueType = 'contrast' | 'altText' | 'touchTarget';
export type Severity = 'error' | 'warning' | 'info';

export type JISMapping = {
  contrast: string;
  altText: string;
  touchTarget: string;
  [k: string]: string;
};

export type IssueRow = {
  timestamp: string;
  frameName: string;
  nodeId: string;
  nodeName: string;
  issueType: IssueType;
  severity: Severity;
  details: string;
  suggestedFix: string;
  JISClauseId: string;
};

export type AnalyzeResult = {
  rows: IssueRow[];
  nodeCount: number;
  errorCount: number;
  warnCount: number;
  perType: Record<string, number>;
  frameName: string;
};

export type Summary = {
  nodeCount: number;
  errorCount: number;
  warnCount: number;
  perType: Record<string, number>;
  frameName: string;
  fileKey?: string | null;
  pageName?: string;
  ruleVersions: { JIS: string; WCAG: string };
};

