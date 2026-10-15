"use client";

import Image from "next/image";
import { DialogFrame } from "@/components/store-dialog";
import { CheckoutModal, ReceiptModal, readSavedReceipt, type SavedReceipt } from "@/components/checkout";
import { StoreAvailability } from "@/components/store-availability";
import { useEffect, useMemo, useState } from "react";
import { PixelBurger } from "@/components/pixel-burger";
import { StorefrontMotion } from "@/components/storefront-motion";
import type {
  CartItem,
  CatalogResult,
  ExtraData,
  ProductData,
  StoreSettingsData,
} from "@/lib/types";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type StorefrontProps = {
  catalog: CatalogResult;
  settings: StoreSettingsData | null;
};

export function Storefront({ catalog, settings }: StorefrontProps) {
  const [savedCart, setCart] = useState<CartItem[] | null>(null);
  const cart = savedCart ?? [];
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(
    null,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<SavedReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let restoredCart: CartItem[] = [];
    try {
      const stored = window.localStorage.getItem("turno-noche-cart");
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) restoredCart = parsed as CartItem[];
    } catch {
      // Unavailable storage or invalid JSON must not prevent ordering.
    }
    // Restore browser-only state after the server and client renders match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(restoredCart);
    try {
      const saved = readSavedReceipt(JSON.parse(window.localStorage.getItem("turno-noche-receipt") ?? "null"));
      setReceipt(saved);
    } catch {}
  }, []);

  useEffect(() => {
    // null means restoration is pending; do not overwrite the saved order.
    if (savedCart === null) return;
    try {
      window.localStorage.setItem(
        "turno-noche-cart",
        JSON.stringify(savedCart),
      );
    } catch {
      // Keep the cart usable in memory when persistence is unavailable.
    }
  }, [savedCart]);

  const filteredProducts = useMemo(() => {
    if (catalog.status !== "configured") return [];
    return activeCategory === "all"
      ? catalog.products
      : catalog.products.filter(
          (product) => product.categoryId === activeCategory,
        );
  }, [activeCategory, catalog]);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  function addItem(item: CartItem) {
    setCart((current) => [...(current ?? []), item]);
    setSelectedProduct(null);
    setCartOpen(true);
  }
  function openCustomizer(product: ProductData) {
    setSelectedProduct(product);
  }
  function removeItem(id: string) {
    setCart((current) => (current ?? []).filter((item) => item.id !== id));
  }
  function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) return removeItem(id);
    setCart((current) =>
      (current ?? []).map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              subtotal: (item.subtotal / item.quantity) * quantity,
            }
          : item,
      ),
    );
  }

  const setupMessage =
    catalog.status === "error"
      ? "No pudimos cargar la carta. Volvé a intentar en unos minutos."
      : "Estamos preparando la carta. Volvé pronto para elegir tu hamburguesa.";

  return (
    <StorefrontMotion>
      <main className="site-shell">
        <a className="skip-link" href="#carta">
          Saltar a la carta
        </a>
        <header className="topbar">
          <a className="brand" href="#carta" aria-label="Ir a la carta">
            <span className="brand-mark">TN</span>
            <span>
              turno
              <br />
              <strong>noche</strong>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <a href="#carta">La carta</a>
            <a href="#pedido">Cómo pedir</a>
          </nav>
          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir carrito, ${itemCount} productos`}
          >
            <span>Pedido</span>
            <b key={itemCount}>{itemCount}</b>
          </button>
        </header>

        <div className="store-service-bar">
          <StoreAvailability hours={settings?.hours ?? {}} />
          {receipt && <button className="arrow-link" onClick={() => setReceiptOpen(true)}>Ver último pedido · {receipt.code}</button>}
        </div>
        <section className="hero-grid">
          <div className="hero-copy">
            <h1>
              La noche
              <br />
              <em>se pide</em>
              <br />
              acá.
            </h1>
            <p className="hero-description">
              Elegí una base, sacale lo que no va y sumale lo que sí.
            </p>
            <a className="primary-action hero-start" href="#carta">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2v12l10-6z" fill="currentColor" />
              </svg>
              Ver la carta
            </a>
            <span className="hero-hint">Tu hambre. Tus reglas.</span>
          </div>
          <div className="hero-image">
            <div className="arcade-screen-head">
              <span>TN / BURGER SELECT</span>
              <span className="screen-light" aria-hidden="true" />
            </div>
            <div className="burger-stage">
              <span className="stage-cross cross-one" aria-hidden="true" />
              <Image
                className="pixel-burger"
                src="/images/hero-burger.png"
                alt="Hamburguesa doble con queso y panceta en pixel art"
                width={405}
                height={460}
                unoptimized
                loading="eager"
              />
              <span className="stage-cross cross-two" aria-hidden="true" />
            </div>
            <div className="arcade-screen-footer">
              <span>HECHA A TU MANERA</span>
              <div className="life-meter" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="arcade-controls" aria-hidden="true">
              <div className="d-pad" />
              <span>
                EL PRÓXIMO MOVIMIENTO
                <br />
                LO ELEGÍS VOS.
              </span>
              <i />
              <i />
            </div>
          </div>
          <div className="hero-meta">
            <span>Elegí tu hamburguesa</span>
            <span>Personalizá los ingredientes</span>
            <span>Confirmá tu pedido</span>
          </div>
        </section>

        <section className="menu-section" id="carta">
          <div className="section-heading">
            <div>
              <h2>
                La carta<span className="heading-dot">.</span>
              </h2>
            </div>
            <p>
              Armá tu pedido sin vueltas.
              <br />
              Cada ingrediente cuenta.
            </p>
          </div>
          {catalog.status === "configured" && catalog.categories.length > 0 && (
            <div
              className="category-nav"
              role="group"
              aria-label="Categorías de la carta"
            >
              <button
                aria-pressed={activeCategory === "all"}
                className={activeCategory === "all" ? "active" : ""}
                onClick={() => setActiveCategory("all")}
              >
                Todo
              </button>
              {catalog.categories.map((category) => (
                <button
                  aria-pressed={activeCategory === category.id}
                  className={activeCategory === category.id ? "active" : ""}
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {catalog.status !== "configured" || catalog.products.length === 0 ? (
            <EmptyCatalog message={setupMessage} />
          ) : (
            <div className="product-list">
              {filteredProducts.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  index={index}
                  onSelect={() => openCustomizer(product)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="how-section" id="pedido">
          <div>
            <h2>Del menú a tu puerta.</h2>
          </div>
          <div className="steps">
            <p>
              <b>01</b> Elegí tu hamburguesa
            </p>
            <p>
              <b>02</b> Personalizá cada mordida
            </p>
            <p>
              <b>03</b> Confirmá por WhatsApp
            </p>
          </div>
        </section>
        <footer className="footer">
          <span>{settings?.businessName ?? "TN / turno noche"}</span>
          <span>{settings?.address ?? "Carta online"}</span>
          <span>
            {settings?.hours
              ? Object.entries(settings.hours)
                  .map(([day, hours]) => `${day}: ${hours}`)
                  .join(" · ")
              : "A tu manera."}
          </span>
        </footer>

        {selectedProduct && (
          <Customizer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={addItem}
          />
        )}
        {cartOpen && (
          <CartDrawer
            cart={cart}
            total={cartTotal}
            onClose={() => setCartOpen(false)}
            onRemove={removeItem}
            onQuantity={updateQuantity}
            onCheckout={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}
        {checkoutOpen && (
          <CheckoutModal
            cart={cart}
            settings={settings}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(confirmation) => {
              setReceipt(confirmation);
              setReceiptOpen(true);
              try { window.localStorage.setItem("turno-noche-receipt", JSON.stringify(confirmation)); } catch {}
              setCart([]);
              setCheckoutOpen(false);
              setCartOpen(false);
            }}
          />
        )}
        {receiptOpen && receipt && <ReceiptModal receipt={receipt} onClose={() => setReceiptOpen(false)} />}
      </main>
    </StorefrontMotion>
  );
}

function EmptyCatalog({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-sprite" aria-hidden="true">
        <PixelBurger />
      </div>
      <div>
        <h3>La cocina está en silencio.</h3>
        <p>{message}</p>
        <button className="arrow-link" onClick={() => window.location.reload()}>
          Volver a intentar
        </button>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  index,
  onSelect,
}: {
  product: ProductData;
  index: number;
  onSelect: () => void;
}) {
  return (
    <article
      className="product-row"
      style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}
    >
      <div
        className="product-photo"
        style={
          product.imageUrl
            ? { backgroundImage: `url(${product.imageUrl})` }
            : undefined
        }
      >
        {!product.imageUrl && <PixelBurger />}
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="product-info">
        <span className="product-category">{product.categoryName}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="ingredient-line">
          {product.ingredients.map((ingredient) => ingredient.name).join(" · ")}
        </div>
      </div>
      <div className="product-action">
        <strong>{money.format(product.price)}</strong>
        <button type="button" disabled={!product.available} onClick={onSelect}>
          {product.available ? "Personalizar" : "Agotada"}
        </button>
      </div>
    </article>
  );
}

function Customizer({
  product,
  onClose,
  onAdd,
}: {
  product: ProductData;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<ExtraData[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const total =
    (product.price + extras.reduce((sum, extra) => sum + extra.price, 0)) *
    quantity;
  const toggleExtra = (extra: ExtraData) =>
    setExtras((current) =>
      current.some((item) => item.id === extra.id)
        ? current.filter((item) => item.id !== extra.id)
        : [...current, extra],
    );
  return (
    <DialogFrame onClose={onClose}>
      {(close) => (
        <section
          className="modal customizer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customizer-title"
        >
          <button
            className="close-button"
            onClick={close}
            aria-label="Cerrar personalizador"
          >
            ×
          </button>
          <div className="modal-head">
            <span>Personalizá tu pedido</span>
            <span>{product.categoryName}</span>
          </div>
          <h2 id="customizer-title">{product.name}</h2>
          <p className="modal-description">{product.description}</p>
          <div className="customizer-grid">
            <div>
              <h3>Viene con</h3>
              <div className="ingredient-controls">
                {product.ingredients.map((ingredient) => (
                  <label
                    className={!ingredient.removable ? "locked" : ""}
                    key={ingredient.id}
                  >
                    <input
                      type="checkbox"
                      checked={!removed.includes(ingredient.id)}
                      disabled={!ingredient.removable}
                      onChange={() =>
                        setRemoved((current) =>
                          current.includes(ingredient.id)
                            ? current.filter((id) => id !== ingredient.id)
                            : [...current, ingredient.id],
                        )
                      }
                    />
                    <span>{ingredient.name}</span>
                    <small>
                      {ingredient.removable ? "quitar" : "incluido"}
                    </small>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3>Sumale algo</h3>
              <div className="extra-controls">
                {product.extras.length ? (
                  product.extras.map((extra) => (
                    <label key={extra.id}>
                      <input
                        type="checkbox"
                        checked={extras.some((item) => item.id === extra.id)}
                        onChange={() => toggleExtra(extra)}
                      />
                      <span>{extra.name}</span>
                      <strong>+{money.format(extra.price)}</strong>
                    </label>
                  ))
                ) : (
                  <p className="muted">
                    No hay extras disponibles para este producto.
                  </p>
                )}
              </div>
            </div>
          </div>
          <label className="field">
            <span>Aclaración</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: punto de cocción, servilletas..."
            />
          </label>
          <div className="modal-bottom">
            <div className="quantity">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Restar cantidad"
              >
                −
              </button>
              <strong>{quantity}</strong>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Sumar cantidad"
              >
                +
              </button>
            </div>
            <button
              className="primary-action"
              onClick={() =>
                onAdd({
                  id: crypto.randomUUID(),
                  productId: product.id,
                  productName: product.name,
                  unitPrice: product.price,
                  quantity,
                  removedIngredientIds: product.ingredients
                    .filter((item) => removed.includes(item.id))
                    .map((item) => item.id),
                  removedIngredients: product.ingredients
                    .filter((item) => removed.includes(item.id))
                    .map((item) => item.name),
                  extras: extras.map(({ id, name, price }) => ({
                    id,
                    name,
                    price,
                  })),
                  notes,
                  subtotal: total,
                })
              }
            >
              Agregar · {money.format(total)}
            </button>
          </div>
        </section>
      )}
    </DialogFrame>
  );
}

function CartDrawer({
  cart,
  total,
  onClose,
  onRemove,
  onQuantity,
  onCheckout,
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onQuantity: (id: string, quantity: number) => void;
  onCheckout: () => void;
}) {
  return (
    <DialogFrame onClose={onClose}>
      {(close) => (
        <aside className="cart-drawer" aria-label="Carrito">
          <div className="drawer-head">
            <div>
              <h2>Tu pedido</h2>
            </div>
            <button
              className="close-button"
              onClick={close}
              aria-label="Cerrar carrito"
            >
              ×
            </button>
          </div>
          {cart.length === 0 ? (
            <div className="drawer-empty">
              <p>Todavía no hay nada en la bolsa.</p>
              <button className="arrow-link" onClick={close}>
                Volver a la carta <span>↘</span>
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div>
                      <strong>
                        {item.quantity} × {item.productName}
                      </strong>
                      <p>
                        {item.extras.length
                          ? `+ ${item.extras.map((extra) => extra.name).join(", ")}`
                          : "Sin extras"}
                        {item.removedIngredients.length
                          ? ` · sin ${item.removedIngredients.join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="cart-item-tools">
                      <b>{money.format(item.subtotal)}</b>
                      <div>
                        <button
                          onClick={() => onQuantity(item.id, item.quantity - 1)}
                          aria-label="Quitar unidad"
                        >
                          −
                        </button>
                        <button
                          onClick={() => onQuantity(item.id, item.quantity + 1)}
                          aria-label="Agregar unidad"
                        >
                          +
                        </button>
                        <button
                          onClick={() => onRemove(item.id)}
                          aria-label="Eliminar producto"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="drawer-total">
                <span>Total</span>
                <strong>{money.format(total)}</strong>
              </div>
              <button className="primary-action wide" onClick={onCheckout}>
                Completar pedido <span>↗</span>
              </button>
            </>
          )}
        </aside>
      )}
    </DialogFrame>
  );
}
