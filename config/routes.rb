Rails.application.routes.draw do
  # Health check for Render: 200 when the app boots, 500 otherwise.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    get "/restaurant", to: "restaurant#show"
    get "/menu", to: "restaurant#menu"

    get "/me", to: "users#show"
    patch "/me", to: "users#update"
    post "/signup", to: "users#create"
    post "/login", to: "sessions#create"
    delete "/logout", to: "sessions#destroy"
    post "/password/forgot", to: "passwords#forgot"
    get "/password/reset", to: "passwords#check"
    post "/password/reset", to: "passwords#reset"

    resources :orders, only: [:index, :create]
    get "/orders/:token", to: "orders#show", as: :order_tracking
    post "/orders/:token/confirm_payment", to: "orders#confirm_payment"
    post "/orders/:token/cancel", to: "orders#cancel"
    post "/stripe/webhook", to: "stripe_webhooks#create"

    resources :catering_inquiries, only: [:create]

    resources :group_orders, only: [:create, :show, :update], param: :token do
      member do
        post :join
        post :items, action: :add_item
        patch "items/:item_id", action: :update_item
        delete "items/:item_id", action: :remove_item
        post :checkout
      end
    end

    namespace :admin do
      resource :stats, only: [:show]
      resource :restaurant, only: [:show, :update]
      resources :orders, only: [:index, :show, :update] do
        post :refund, on: :member
      end
      resources :categories, only: [:index, :create, :update, :destroy] do
        patch :reorder, on: :collection
      end
      resources :menu_items, only: [:create, :update, :destroy] do
        patch :reorder, on: :collection
      end
      resources :photos, only: [:create]
      resources :modifier_groups, only: [:index, :create, :update, :destroy]
      resources :users, only: [:index, :update] do
        post :reset_link, on: :member
      end
      resources :catering_inquiries, only: [:index, :update, :destroy]
    end

    match "*path", to: ->(_env) { [404, { "Content-Type" => "application/json" }, ['{"errors":["Not found"]}']] }, via: :all
  end

  # Let React Router handle every other page (e.g. refreshing /menu or /admin).
  root "fallback#index"
  get "*path",
      to: "fallback#index",
      constraints: ->(req) { !req.xhr? && req.format.html? }
end
