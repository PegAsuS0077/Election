"""
r2.py — Cloudflare R2 upload helper (S3-compatible via boto3).

Required environment variables:
  R2_ACCOUNT_ID         Cloudflare account ID (used only for documentation/logging)
  R2_ACCESS_KEY_ID      R2 API token — Access Key ID
  R2_SECRET_ACCESS_KEY  R2 API token — Secret Access Key
  R2_BUCKET             Bucket name
  R2_ENDPOINT           https://<account-id>.r2.cloudflarestorage.com

Files are uploaded with:
  Content-Type:  application/json
  Cache-Control: public, max-age=25

max-age=25 ensures CDN caches are stale within one scrape cycle (30 s),
so clients always see data that is at most ~55 s old (25 s CDN + 30 s scrape).
"""

import json
import os

import boto3
from botocore.config import Config

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    endpoint = os.environ["R2_ENDPOINT"]
    access_key = os.environ["R2_ACCESS_KEY_ID"]
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"]

    _client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return _client


def upload_json(filename: str, data: object) -> None:
    """
    Serialise `data` to JSON and upload to R2 as `filename`.

    Raises on any boto3 / network error — caller is responsible for catching.
    """
    bucket = os.environ["R2_BUCKET"]
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")

    _get_client().put_object(
        Bucket=bucket,
        Key=filename,
        Body=body,
        ContentType="application/json",
        CacheControl="public, max-age=25",
    )
