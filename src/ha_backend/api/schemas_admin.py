from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobSummarySchema(BaseModel):
    id: int
    sourceCode: str
    sourceName: str
    name: str
    status: str
    retryCount: int
    createdAt: datetime
    queuedAt: Optional[datetime]
    startedAt: Optional[datetime]
    finishedAt: Optional[datetime]
    cleanupStatus: str
    cleanedAt: Optional[datetime]
    crawlerExitCode: Optional[int]
    crawlerStatus: Optional[str]
    warcFileCount: int
    warcBytesTotal: int
    indexedPageCount: int
    storageScannedAt: Optional[datetime] = None
    editionId: Optional[int] = None
    shardKey: Optional[str] = None
    shardKind: Optional[str] = None
    acceptanceState: Optional[str] = None


class JobDetailSchema(BaseModel):
    id: int
    sourceCode: str
    sourceName: str
    name: str
    status: str
    retryCount: int
    createdAt: datetime
    queuedAt: Optional[datetime]
    startedAt: Optional[datetime]
    finishedAt: Optional[datetime]
    cleanupStatus: str
    cleanedAt: Optional[datetime]
    outputDir: str
    crawlerExitCode: Optional[int]
    crawlerStatus: Optional[str]
    crawlerStage: Optional[str]
    warcFileCount: int
    warcBytesTotal: int
    indexedPageCount: int
    pagesCrawled: int
    pagesTotal: int
    pagesFailed: int
    outputBytesTotal: int
    tmpBytesTotal: int
    tmpNonWarcBytesTotal: int
    storageScannedAt: Optional[datetime] = None
    finalZimPath: Optional[str]
    combinedLogPath: Optional[str]
    stateFilePath: Optional[str]
    editionId: Optional[int] = None
    shardKey: Optional[str] = None
    shardKind: Optional[str] = None
    acceptanceState: Optional[str] = None
    coverageReportPath: Optional[str] = None
    config: Optional[Dict[str, Any]]
    lastStats: Optional[Dict[str, Any]]


class JobSnapshotSummarySchema(BaseModel):
    id: int
    url: str
    captureTimestamp: datetime
    statusCode: Optional[int]
    language: Optional[str]
    title: Optional[str]


class JobListResponseSchema(BaseModel):
    items: List[JobSummarySchema]
    total: int
    limit: int
    offset: int


class AnnualEditionShardSchema(BaseModel):
    jobId: int
    name: str
    status: str
    shardKey: Optional[str]
    shardKind: str
    acceptanceState: str
    captureBackend: Optional[str]
    indexedPageCount: int
    pagesCrawled: int
    pagesTotal: int
    pagesFailed: int
    retryCount: int


class AnnualEditionAdminSchema(BaseModel):
    editionId: int
    sourceCode: str
    sourceName: str
    year: int
    status: str
    searchReady: bool
    researchReady: bool
    intendedUrlCount: int
    capturedUrlCount: int
    failedUrlCount: int
    missingUrlCount: int
    excludedUrlCount: int
    fallbackUrlCount: int
    shardCount: int
    indexedShardCount: int
    needsReviewShardCount: int
    backendCounts: Dict[str, int]
    coverageSummary: Dict[str, Any]
    generatedAt: Optional[datetime]
    targetLedgerPath: Optional[str]
    captureManifestPath: Optional[str]
    coverageReportJsonPath: Optional[str]
    coverageReportMdPath: Optional[str]
    shards: List[AnnualEditionShardSchema] = Field(default_factory=list)


class AnnualEditionListResponseSchema(BaseModel):
    items: List[AnnualEditionAdminSchema]
    total: int
    limit: int
    offset: int


class JobStatusCountsSchema(BaseModel):
    counts: Dict[str, int]


class SearchDebugItemSchema(BaseModel):
    id: int
    title: Optional[str]
    sourceCode: str
    sourceName: str
    language: Optional[str]
    captureTimestamp: datetime
    statusCode: Optional[int]
    originalUrl: str
    normalizedUrlGroup: Optional[str]

    # Signals (raw)
    inlinkCount: Optional[int]
    outlinkCount: Optional[int]
    pagerank: Optional[float]

    # Score breakdown (components)
    rankText: Optional[float]
    titleBoost: float
    archivedPenalty: float
    queryPenalty: float
    trackingPenalty: float
    depthPenalty: float
    authorityBoost: float
    hubnessBoost: float
    pagerankBoost: float

    totalScore: Optional[float]

    # pages view only
    groupScore: Optional[float] = None
    bestSnapshotId: Optional[int] = None


class SearchDebugResponseSchema(BaseModel):
    results: List[SearchDebugItemSchema]
    total: int
    page: int
    pageSize: int

    dialect: str
    mode: str
    view: str
    sort: str
    rankingVersion: str
    queryMode: Optional[str]
    usedPageSignals: bool
    usedSnapshotOutlinks: bool
    usedPagerank: bool


class IssueReportSummarySchema(BaseModel):
    id: int
    category: str
    status: str
    createdAt: datetime
    snapshotId: Optional[int]
    originalUrl: Optional[str]
    pageUrl: Optional[str]


class IssueReportDetailSchema(BaseModel):
    id: int
    category: str
    status: str
    createdAt: datetime
    updatedAt: datetime
    snapshotId: Optional[int]
    originalUrl: Optional[str]
    pageUrl: Optional[str]
    reporterEmail: Optional[str]
    description: str
    internalNotes: Optional[str]


class IssueReportListResponseSchema(BaseModel):
    items: List[IssueReportSummarySchema]
    total: int
    limit: int
    offset: int


__all__ = [
    "JobSummarySchema",
    "JobDetailSchema",
    "JobSnapshotSummarySchema",
    "JobListResponseSchema",
    "AnnualEditionAdminSchema",
    "AnnualEditionListResponseSchema",
    "AnnualEditionShardSchema",
    "JobStatusCountsSchema",
    "SearchDebugItemSchema",
    "SearchDebugResponseSchema",
    "IssueReportSummarySchema",
    "IssueReportDetailSchema",
    "IssueReportListResponseSchema",
]
