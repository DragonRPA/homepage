export interface GeneralStandardArticle {
  id: string;
  chapterNo: string;
  chapterTitle: string;
  articleNo: string;
  articleTitle: string;
  paragraphs: string[];
  relatedGuidanceIds: string[];
  keywords: string[];
  pdfUrl: string;
}

export interface GeneralGuidanceSection {
  id: string;
  chapterNo: string;
  sectionNo: string;
  sectionTitle: string;
  summaryTable?: {
    title: string;
    rows: string[];
  };
  blocks: {
    subtitle: string;
    content: string[];
    exampleBox?: {
      title: string;
      lines: string[];
    };
  }[];
  relatedArticleIds: string[];
  keywords: string[];
  pdfUrl: string;
}
