// CloudFront Function(cloudfront-js-2.0), viewer-request 단계.
// 비공개 S3(REST 엔드포인트)는 폴더 주소에서 index.html을 찾아 주지 않아서 여기서 주소를 바꾼다.
// 사이트는 trailingSlash: 'always'로 빌드되므로 끝 슬래시가 없는 페이지 주소는 슬래시를 붙여 보낸다.
function handler(event) {
  const request = event.request;
  const uri = request.uri;
  // www.<도메인>으로 들어오면 기본 도메인의 같은 주소로 보낸다(canonical과 주소를 하나로 맞춘다).
  const host = request.headers.host ? request.headers.host.value : '';
  if (host.startsWith('www.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://' + host.slice(4) + uri } },
    };
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  const last = uri.slice(uri.lastIndexOf('/') + 1);
  if (!last.includes('.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: uri + '/' } },
    };
  }
  return request;
}
