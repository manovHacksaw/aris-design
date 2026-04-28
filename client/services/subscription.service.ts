import { apiRequest } from "./api";

export interface SubscriptionStatus {
    success: boolean;
    isSubscribed: boolean;
}

export async function subscribeToBrand(brandId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/subscriptions/${brandId}`, {
        method: "POST",
    });
}

export async function unsubscribeFromBrand(brandId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/subscriptions/${brandId}`, {
        method: "DELETE",
    });
}

export async function getSubscriptionStatus(brandId: string): Promise<boolean> {
    try {
        const res = await apiRequest<SubscriptionStatus>(`/subscriptions/${brandId}/status`);
        return res.isSubscribed;
    } catch {
        return false;
    }
}

export async function getSubscriberCount(brandId: string): Promise<number> {
    const res = await apiRequest<{ success: boolean; count: number }>(`/subscriptions/brand/${brandId}/count`);
    return res.count;
}

export async function getMySubscriptions(): Promise<any[]> {
    const res = await apiRequest<{ success: boolean; subscriptions: any[] }>("/subscriptions/my-subscriptions");
    return res.subscriptions;
}
