export interface Product {
  id: string;
  name: string;
  category: 'sofa' | 'chair' | 'table' | 'lamp' | 'rug';
  price: number;
  image: string;
  description: string;
}

export type SearchState = 'IDLE' | 'UPLOADING' | 'ANALYZING' | 'RESULTS';
