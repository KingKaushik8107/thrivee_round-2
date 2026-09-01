import os
import json
from fastapi import APIRouter, HTTPException
from backend.config import settings

router = APIRouter(prefix="/model", tags=["ML Model"])

@router.get("/metrics")
def get_model_metrics():
    """
    Returns real evaluation metrics, confusion matrix, and feature importance generated during ML training.
    """
    metrics_path = os.path.join(settings.MODEL_DIR, "metrics.json")
    
    if not os.path.exists(metrics_path):
        # Trigger on-demand training and evaluation
        try:
            from backend.ml.train import train_pipeline
            print("[+] Training model to generate metrics.json...")
            _, metrics = train_pipeline(force_dataset_download=False)
            return metrics
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate model metrics: {str(e)}")

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)
        return metrics_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metrics artifact: {str(e)}")
