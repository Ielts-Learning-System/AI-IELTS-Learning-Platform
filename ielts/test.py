import numpy as np
from typing import List, Union

def calculate_geometric_mean(returns: List[Union[float, int]]) -> float:
    """
    Tính tỷ suất lợi nhuận trung bình nhân (Geometric Mean) của danh mục đầu tư.
    
    Args:
        returns (List[float]): Danh sách các tỷ suất lợi nhuận ròng từng kỳ (ví dụ: 0.10 cho 10%).
        
    Returns:
        float: Lợi nhuận trung bình nhân mỗi kỳ. Trả về 0.0 nếu danh sách rỗng.
    """
    if not returns:
        return 0.0
        
    # Chuyển đổi list thành numpy array để tính toán vector hóa nhanh hơn
    returns_array = np.array(returns)
    
    # Bước 1: Tránh lỗi toán học bằng cách chuyển sang Hệ số nhân tài sản (Gross Return)
    # Nếu có bất kỳ giá trị nào <= -1.0 (mất 100% vốn), trung bình nhân sẽ trả về -1.0 (phá sản)
    if np.any(returns_array <= -1.0):
        return -1.0
        
    gross_returns = 1.0 + returns_array
    
    # Bước 2: Nhân tất cả các hệ số và lấy căn bậc n
    n = len(returns_array)
    cumulative_growth = np.prod(gross_returns)
    geometric_mean_gross = cumulative_growth ** (1.0 / n)
    
    # Bước 3: Trừ đi 1 để quay lại tỷ suất lợi nhuận ròng (Net Return)
    geometric_mean_net = geometric_mean_gross - 1.0
    
    return float(geometric_mean_net)

# ==========================================
# KIỂM THỬ (TESTING)
# ==========================================
if __name__ == "__main__":
    # Kịch bản: Năm 1 lãi 10%, Năm 2 lỗ 5%, Năm 3 lãi 20%
    portfolio_returns = [0.10, -0.05, 0.20] 
    
    result = calculate_geometric_mean(portfolio_returns)
    print(f"Danh sách lợi nhuận từng kỳ: {[f'{r:.1%}' for r in portfolio_returns]}")
    print(f"Lợi nhuận trung bình nhân (Mỗi kỳ): {result:.2%}")
    # Output kỳ vọng: ~7.83%
