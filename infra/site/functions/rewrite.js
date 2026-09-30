// CloudFront Function(cloudfront-js-2.0), viewer-request 단계.
// 비공개 S3(REST 엔드포인트)는 폴더 주소에서 index.html을 찾아 주지 않아서 여기서 주소를 바꾼다.
// 사이트는 trailingSlash: 'always'로 빌드되므로 끝 슬래시가 없는 페이지 주소는 슬래시를 붙여 보낸다.
function handler(event) {
  const request = event.request;
  const uri = request.uri;
  const last = uri.slice(uri.lastIndexOf('/') + 1);
  // 끝 슬래시가 없는 페이지 주소는 슬래시를 붙인 주소가 정식이다. 파일(점이 있는 이름)은 그대로다.
  const path = uri.endsWith('/') || last.includes('.') ? uri : uri + '/';
  // www.<도메인>으로 들어오면 기본 도메인의 정식 주소로 한 번에 보낸다(canonical과 주소를 하나로 맞춘다).
  const host = request.headers.host ? request.headers.host.value : '';
  if (host.startsWith('www.')) {
    return redirect('https://' + host.slice(4) + path + query(request.querystring));
  }
  if (path !== uri) {
    return redirect(path + query(request.querystring));
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  }
  return request;
}

// 쿼리 문자열은 받은 모양(인코딩 그대로)으로 다시 붙인다. 같은 키가 여러 번 오면 multiValue에 모두 있다.
function query(querystring) {
  const parts = [];
  for (const key in querystring) {
    const item = querystring[key];
    if (item.multiValue) {
      item.multiValue.forEach(function (v) {
        parts.push(key + '=' + v.value);
      });
    } else {
      parts.push(key + '=' + item.value);
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}
