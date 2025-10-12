// Types for Hacker News API

export interface Item {
  id: number;
  deleted?: boolean;
  type?: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
  visited?: boolean;
}

export interface Story extends Item {
  type: 'story';
  title: string;
  url?: string;
  score: number;
  descendants: number;
  visited?: boolean;
}

export interface Comment extends Item {
  type: 'comment';
  text: string;
  parent: number;
}

export interface User {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}