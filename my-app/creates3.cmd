aws s3 mb --region us-east-1 "s3://searchkitproxy-demo" 
aws s3api put-public-access-block ^
    --bucket searchkitproxy-demo ^
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
aws s3api put-bucket-policy --bucket searchkitproxy-demo --policy "{\"Version\": \"2012-10-17\",\"Statement\": [  {       \"Sid\": \"PublicReadGetObject\",     \"Effect\": \"Allow\",        \"Principal\": \"*\",          \"Action\": \"s3:GetObject\",          \"Resource\": \"arn:aws:s3:::searchkitproxy-demo/*\"      }  ]}"

aws s3 website "s3://searchkitproxy-demo" --index-document index.html --error-document index.html

aws s3 sync build "s3://searchkitproxy-demo/" 