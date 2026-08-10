const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}
